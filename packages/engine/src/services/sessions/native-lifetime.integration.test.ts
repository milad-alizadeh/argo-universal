import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  agentAdapters,
  type AgentAdapter,
  type AgentMapping,
  type VendorCommand,
  type VendorSession,
} from '@repo/agents';
import { sessionRows } from '@repo/api/mocks';
import { permissionOptions } from '@repo/contracts';
import {
  createMockAdapter,
  type MockAgentStream,
  type MockAgentStreamEvent,
  mockReady,
} from '@repo/mocks/agent';
import { afterEach, expect, it, onTestFinished, vi } from 'vitest';
import { waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { messageChange } from '#mocks/feed';
import { initTestRepository } from '#mocks/git';
import { startRouterTestHost } from '#mocks/router';
import { createSessionHost, firstPrompt } from '#mocks/session';
import { appRouter } from '../../engine/router';
import { toSessionSnapshot } from './session-snapshot';

const nativeCrash = 'Native instance crashed';
const missingStream = 'The Agent has no stream';
const turnStartedEvent = 'agent.turnStarted';
const answerPermissionCommand = 'agent.answerPermission';
const answerElicitationCommand = 'agent.answerElicitation';
const cancelCommand = 'agent.cancel';
const turnEndedEvent = 'agent.turnEnded';
const usageEvent = 'agent.usage';
const feedEvent = 'agent.feed';
const sessionId = 'session-1';
const closeEvent = 'session.close';
const setConfigCommand = 'agent.setConfigOption';
const promptCommand = 'agent.prompt';

afterEach((): void => vi.useRealTimers());

function createNativeSessionHost(
  adapter: AgentAdapter,
): ReturnType<typeof createSessionHost> {
  const { database, remove } = openTestDatabase({ agent: adapter.agent });
  onTestFinished(remove);
  return createSessionHost(database, adapter);
}
async function startSession(
  adapter: AgentAdapter,
): Promise<ReturnType<typeof createSessionHost>> {
  const host = createNativeSessionHost(adapter);
  await waitFor(host.session, (snapshot): boolean => snapshot.can(firstPrompt));
  return host;
}

function publicSnapshot(
  host: ReturnType<typeof createSessionHost>,
): ReturnType<typeof toSessionSnapshot> {
  const feed = host.findFeed();
  if (!feed) throw new Error('The Session has no live Feed');
  return toSessionSnapshot(
    host.session.getSnapshot(),
    feed.getSnapshot(),
    sessionRows.idle,
  );
}

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'starts an autonomous Turn without a human prompt for Agent %s',
  async (agent): Promise<void> => {
    let stream: MockAgentStream | undefined;
    const commands: VendorCommand[] = [];
    const host = await startSession(
      createMockAdapter(
        {
          stream: (nativeStream): undefined => {
            stream = nativeStream;
            nativeStream.receive((command): number => commands.push(command));
          },
        },
        agent,
      ),
    );
    if (!stream) throw new Error(missingStream);
    stream.send({ type: turnStartedEvent });
    stream.send({ type: feedEvent, change: messageChange('settled') });
    const snapshot = publicSnapshot(host);
    expect(snapshot).toMatchObject({
      state: 'running',
      activeTurnId: expect.any(String),
    });
    expect(
      (await host.caller.feed.row({ sessionId: sessionId, id: 'reply' }))
        .turnId,
    ).toBe(snapshot.activeTurnId);
    expect(commands).toEqual([]);
    host.session.send({ type: closeEvent });
    await waitFor(
      host.session,
      (current): boolean => current.status === 'done',
    );
    const writer = host.databaseWriter;
    writer.send({ type: 'writer.drain' });
    await waitFor(writer, (current): boolean => current.status === 'done');
    expect(
      (await host.caller.feed.row({ sessionId: sessionId, id: 'reply' }))
        .turnId,
    ).toBe(snapshot.activeTurnId);
  },
);

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'keeps the running autonomous Turn identity on duplicate start for Agent %s',
  async (agent): Promise<void> => {
    let stream: MockAgentStream | undefined;
    const host = await startSession(
      createMockAdapter(
        {
          stream: (nativeStream): undefined => {
            stream = nativeStream;
            nativeStream.send({ type: turnStartedEvent });
          },
        },
        agent,
      ),
    );
    if (!stream) throw new Error(missingStream);
    const runningTurn = publicSnapshot(host);
    expect(runningTurn.state).toBe('running');
    stream.send({ type: turnStartedEvent });
    expect(publicSnapshot(host).activeTurnId).toBe(runningTurn.activeTurnId);
  },
);

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'waits for a retired native stop when closing the recovered Session for Agent %s',
  async (agent): Promise<void> => {
    vi.useFakeTimers();
    const retiredStop = Promise.withResolvers<void>();
    let stream: MockAgentStream | undefined;
    let stopCalls = 0;
    const host = await startSession(
      createMockAdapter(
        {
          stream: (nativeStream): undefined => {
            stream = nativeStream;
          },
          stop: (): Promise<void> =>
            ++stopCalls === 1 ? retiredStop.promise : Promise.resolve(),
        },
        agent,
      ),
    );
    if (!stream) throw new Error(missingStream);
    stream.fail(new Error(nativeCrash));
    await vi.advanceTimersByTimeAsync(1000);
    host.session.send({ type: closeEvent });
    await vi.advanceTimersByTimeAsync(0);
    expect(host.session.getSnapshot().status).toBe('active');
    retiredStop.resolve();
    await waitFor(
      host.session,
      (snapshot): boolean => snapshot.status === 'done',
    );
    expect(stopCalls).toBe(2);
  },
);

it('waits for native stop before publishing the final Feed batch', async (): Promise<void> => {
  vi.useFakeTimers();
  const stopped = Promise.withResolvers<void>();
  let stream: MockAgentStream | undefined;
  const host = await startSession(
    createMockAdapter({
      stream: (nativeStream): undefined => {
        stream = nativeStream;
      },
      stop: (): Promise<void> => stopped.promise,
    }),
  );
  const subscriber = new AbortController();
  onTestFinished((): void => subscriber.abort());
  const updates = (
    await appRouter
      .createCaller(host.context, { signal: subscriber.signal })
      .feed.subscribe({ sessionId, after: null })
  )[Symbol.asyncIterator]();
  await updates.next();
  if (!stream) throw new Error(missingStream);
  stream.send({ type: feedEvent, change: messageChange('open') });
  expect((await updates.next()).value).toMatchObject({ type: 'snapshot' });
  let finalBatchPublished = false;
  const finalBatch = updates.next().then((result): typeof result => {
    finalBatchPublished = true;
    return result;
  });
  host.session.send({ type: closeEvent });
  await vi.advanceTimersByTimeAsync(0);
  expect(finalBatchPublished).toBe(false);
  stopped.resolve();
  await vi.advanceTimersByTimeAsync(0);
  expect((await finalBatch).value).toMatchObject({ type: 'row.upsert' });
});

it('keeps the original native close deadline when close repeats', async (): Promise<void> => {
  vi.useFakeTimers();
  const host = await startSession(
    createMockAdapter({
      stop: (): Promise<void> => new Promise((): void => {}),
    }),
  );
  host.session.send({ type: closeEvent });
  await vi.advanceTimersByTimeAsync(4000);
  host.session.send({ type: closeEvent });
  await vi.advanceTimersByTimeAsync(999);
  expect(host.session.getSnapshot().status).toBe('active');
  await vi.advanceTimersByTimeAsync(1);
  expect(host.session.getSnapshot().status).toBe('done');
});

it('finishes shutdown when native stop rejects without restarting', async (): Promise<void> => {
  let connects = 0;
  const host = await startSession(
    createMockAdapter({
      connect: async (): Promise<typeof mockReady> => {
        connects += 1;
        return mockReady;
      },
      stop: async (): Promise<void> => {
        throw new Error('Native stop failed');
      },
    }),
  );
  host.session.send({ type: closeEvent });
  await waitFor(
    host.session,
    (snapshot): boolean => snapshot.status === 'done',
  );
  expect(connects).toBe(1);
  expect(host.session.getSnapshot().output).toEqual({ failure: null });
});

it('retries timed-out startup after the existing one-second recovery delay', async (): Promise<void> => {
  vi.useFakeTimers();
  let connects = 0;
  const began = Promise.withResolvers<void>();
  const host = createNativeSessionHost(
    createMockAdapter({
      connect: (): Promise<typeof mockReady> => {
        began.resolve();
        return ++connects === 1
          ? new Promise((): void => {})
          : Promise.resolve(mockReady);
      },
    }),
  );
  await began.promise;
  await vi.advanceTimersByTimeAsync(11_000);
  expect(connects).toBe(2);
  expect(publicSnapshot(host).state).toBe('idle');
});

it('closes a native instance once when startup resolves after the close deadline', async (): Promise<void> => {
  vi.useFakeTimers();
  const ready = Promise.withResolvers<typeof mockReady>();
  const began = Promise.withResolvers<void>();
  let signal: AbortSignal | undefined;
  let stopCalls = 0;
  const host = createNativeSessionHost(
    createMockAdapter({
      connect: (_connectInput, startupSignal): Promise<typeof mockReady> => {
        signal = startupSignal;
        began.resolve();
        return ready.promise;
      },
      stop: async (): Promise<void> => {
        stopCalls += 1;
      },
    }),
  );
  await began.promise;
  host.session.send({ type: closeEvent });
  await vi.advanceTimersByTimeAsync(5000);
  expect(host.session.getSnapshot().status).toBe('done');
  expect(signal?.aborted).toBe(true);
  ready.resolve(mockReady);
  await vi.advanceTimersByTimeAsync(0);
  expect(stopCalls).toBe(1);
  expect(
    (
      await host.caller.feed.page({
        sessionId: sessionId,
        direction: 'tail',
        limit: 40,
      })
    ).rows,
  ).toEqual([]);
});

it('ignores callbacks from the retired native instance after recovery', async (): Promise<void> => {
  vi.useFakeTimers();
  const streams: MockAgentStream[] = [];
  const host = await startSession(
    createMockAdapter({
      stream: (nativeStream): undefined => {
        streams.push(nativeStream);
      },
    }),
  );
  const retired = streams[0];
  if (!retired) throw new Error(missingStream);
  retired.fail(new Error(nativeCrash));
  await vi.advanceTimersByTimeAsync(1000);
  retired.send({ type: turnStartedEvent });
  retired.send({ type: feedEvent, change: messageChange('settled') });
  expect(publicSnapshot(host)).toMatchObject({
    state: 'idle',
    activeTurnId: null,
  });
  await expect(
    host.caller.feed.row({ sessionId: sessionId, id: 'reply' }),
  ).rejects.toThrow('No row reply');
});

it('admits early events only after readiness', async (): Promise<void> => {
  const host = await startSession(
    createMockAdapter({
      stream: (nativeStream): undefined => {
        nativeStream.send({ type: turnStartedEvent });
        nativeStream.send({
          type: feedEvent,
          change: messageChange('settled'),
        });
      },
    }),
  );
  expect(publicSnapshot(host).state).toBe('running');
  expect(
    (await host.caller.feed.row({ sessionId: sessionId, id: 'reply' })).turnId,
  ).toBe(publicSnapshot(host).activeTurnId);
});

it('rejects invalid usage before changing the public Session snapshot', async (): Promise<void> => {
  const errors: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args): number =>
    errors.push(args),
  );
  onTestFinished((): void => {
    vi.restoreAllMocks();
  });
  let stream: MockAgentStream | undefined;
  const host = await startSession(
    createMockAdapter({
      stream: (nativeStream): undefined => {
        stream = nativeStream;
      },
    }),
  );
  if (!stream) throw new Error(missingStream);
  stream.send({ type: usageEvent, usage: { used: Number.NaN, size: 100 } });
  expect(publicSnapshot(host).usage).toBeNull();
  expect(errors.flat().join(' ')).toContain('Invalid Argo event: agent.usage');
});

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'cancels a pending prompt after its prior configuration completes for Agent %s',
  async (agent): Promise<void> => {
    vi.useFakeTimers();
    const configured = Promise.withResolvers<void>();
    const prompted = Promise.withResolvers<void>();
    const commands: VendorCommand[] = [];
    const host = await startSession({
      ...createMockAdapter({}, agent),
      connect: async (): Promise<VendorSession> => ({
        ready: mockReady,
        run: async (command): Promise<void> => {
          commands.push(command);
          if (command.type === setConfigCommand) await configured.promise;
          if (command.type === promptCommand) await prompted.promise;
          if (command.type === cancelCommand) prompted.resolve();
        },
        stop: async (): Promise<void> => {},
      }),
    });
    host.session.send({
      type: 'session.setConfigOption',
      configId: 'model',
      value: 'careful',
    });
    host.session.send(firstPrompt);
    await vi.advanceTimersByTimeAsync(0);
    host.session.send({ type: 'session.cancel' });
    await vi.advanceTimersByTimeAsync(0);
    expect(commands.map((command): string => command.type)).toEqual([
      setConfigCommand,
    ]);
    configured.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(commands.map((command): string => command.type)).toEqual([
      setConfigCommand,
      promptCommand,
      cancelCommand,
    ]);
  },
);

it.each(
  agentAdapters.flatMap(({ agent }) =>
    ['permission', 'elicitation'].map((requestKind) => ({
      agent,
      requestKind,
    })),
  ),
)(
  'answers $requestKind while the native prompt is pending for Agent $agent',
  async ({ agent, requestKind }): Promise<void> => {
    vi.useFakeTimers();
    const responded = Promise.withResolvers<void>();
    const commands: VendorCommand[] = [];
    const host = await startSession({
      ...createMockAdapter({}, agent),
      connect: async (_connectInput, listener): Promise<VendorSession> => ({
        ready: mockReady,
        run: async (command): Promise<void> => {
          commands.push(command);
          if (command.type === promptCommand) {
            listener.event(
              requestKind === 'permission'
                ? {
                    type: 'agent.permissionRequested',
                    request: {
                      toolCallId: 'current',
                      title: 'Run command',
                      options: permissionOptions,
                    },
                  }
                : {
                    type: 'agent.elicitationRequested',
                    request: {
                      mode: 'form',
                      message: 'Which file?',
                      requestedSchema: { properties: {} },
                    },
                  },
            );
            await responded.promise;
          } else if (
            command.type === answerPermissionCommand ||
            command.type === answerElicitationCommand
          ) {
            responded.resolve();
            listener.event({ type: turnEndedEvent, stopReason: 'end_turn' });
          }
        },
        stop: async (): Promise<void> => {},
      }),
    });
    host.session.send(firstPrompt);
    await vi.advanceTimersByTimeAsync(0);
    host.session.send(
      requestKind === 'permission'
        ? {
            type: 'session.answerPermission',
            toolCallId: 'current',
            optionId: null,
          }
        : { type: 'session.answerElicitation', action: 'cancel' },
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(commands.map((command): string => command.type)).toEqual([
      promptCommand,
      requestKind === 'permission'
        ? answerPermissionCommand
        : answerElicitationCommand,
    ]);
    expect(publicSnapshot(host).state).toBe('idle');
  },
);

it('waits for native cleanup after a real Feed failure', async (): Promise<void> => {
  const stopping = Promise.withResolvers<void>();
  let stream: MockAgentStream | undefined;
  const host = await startSession(
    createMockAdapter({
      stream: (nativeStream): undefined => {
        stream = nativeStream;
      },
      stop: (): Promise<void> => stopping.promise,
    }),
  );
  if (!stream) throw new Error(missingStream);
  vi.spyOn(Date, 'now').mockImplementationOnce((): never => {
    throw new Error('Feed clock failed');
  });
  stream.send({ type: feedEvent, change: messageChange('settled') });
  await Promise.resolve();
  expect(host.session.getSnapshot().status).toBe('active');
  stopping.resolve();
  await waitFor(
    host.session,
    (snapshot): boolean => snapshot.status === 'done',
  );
  expect(host.session.getSnapshot().output).toEqual({
    failure: 'Error: Feed clock failed',
  });
});

it('rejects malformed native readiness before admitting a prompt', async (): Promise<void> => {
  vi.useFakeTimers();
  const connected = Promise.withResolvers<void>();
  const commands: VendorCommand[] = [];
  let stopCalls = 0;
  const host = createNativeSessionHost(
    createMockAdapter({
      connect: async (): Promise<typeof mockReady> => {
        connected.resolve();
        return Object.assign({}, mockReady, { configOptions: null });
      },
      stream: (nativeStream): undefined => {
        nativeStream.receive((command): number => commands.push(command));
      },
      stop: async (): Promise<void> => {
        stopCalls += 1;
      },
    }),
  );
  await connected.promise;
  await vi.advanceTimersByTimeAsync(0);
  expect(host.session.getSnapshot().can(firstPrompt)).toBe(false);
  expect(commands).toEqual([]);
  expect(stopCalls).toBe(1);
});

it('reports a mapping rejection then continues from the last accepted mapping state', async (): Promise<void> => {
  const log = vi.spyOn(console, 'error').mockImplementation((): void => {});
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (nativeStream): undefined => {
      stream = nativeStream;
    },
  });
  const observed: number[] = [];
  const mapped: AgentAdapter<MockAgentStreamEvent, number> = {
    ...adapter,
    initialMappingState: (): number => 0,
    toAgentEvents: (message, mappingState): AgentMapping<number> => {
      observed.push(mappingState);
      if (message.type === usageEvent)
        throw new Error('Unrecognised native response');
      return { events: [message], mappingState: mappingState + 1 };
    },
  };
  const host = await startSession(mapped);
  if (!stream) throw new Error(missingStream);
  stream.send({ type: turnStartedEvent });
  stream.send({ type: usageEvent, usage: { used: 1, size: 2 } });
  stream.send({ type: feedEvent, change: messageChange('settled') });
  expect(observed).toEqual([0, 1, 1]);
  expect(
    await host.caller.feed.row({ sessionId: sessionId, id: 'reply' }),
  ).toMatchObject({ sessionUpdate: 'agent_message' });
  expect(log).toHaveBeenCalledWith(
    'session session-1: rejected an Agent message: Unrecognised native response',
  );
});

it('keeps a starting Session owned until native cleanup completes during collective shutdown', async (): Promise<void> => {
  vi.useFakeTimers();
  const ready = Promise.withResolvers<typeof mockReady>();
  const began = Promise.withResolvers<void>();
  let stopCalls = 0;
  const host = startRouterTestHost({
    adapters: [
      createMockAdapter({
        connect: (): Promise<typeof mockReady> => {
          began.resolve();
          return ready.promise;
        },
        stop: async (): Promise<void> => {
          stopCalls += 1;
        },
      }),
    ],
  });
  const prompt = host.caller.session
    .prompt({
      sessionId: sessionId,
      prompt: [{ type: 'text', text: 'Start' }],
    })
    .catch((error: unknown): unknown => error);
  await began.promise;
  host.sessionRegistry.send({ type: 'sessions.stopAll' });
  await vi.advanceTimersByTimeAsync(0);
  expect(host.sessionRegistry.getSnapshot().status).toBe('active');
  ready.resolve(mockReady);
  await vi.advanceTimersByTimeAsync(0);
  expect(host.sessionRegistry.getSnapshot().status).toBe('done');
  expect(stopCalls).toBe(1);
  expect(await prompt).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
});

it('stops the new native instance before discarding a failed Session Checkout', async (): Promise<void> => {
  const projectPath = realpathSync(
    mkdtempSync(join(tmpdir(), 'session-native-checkout-')),
  );
  const git = initTestRepository(projectPath);
  const owned = openTestDatabase({}, projectPath);
  onTestFinished((): void => {
    owned.remove();
    rmSync(projectPath, { recursive: true, force: true });
  });
  const stopped = Promise.withResolvers<void>();
  const stopping = Promise.withResolvers<void>();
  let checkoutPath: string | undefined;
  const host = startRouterTestHost({
    database: owned.database,
    runtimeDirectory: join(projectPath, '.argo'),
    adapters: [
      createMockAdapter({
        connect: async (connectInput): Promise<typeof mockReady> => {
          checkoutPath = connectInput.cwd;
          return Object.assign({}, mockReady, { configOptions: null });
        },
        stop: (): Promise<void> => {
          stopping.resolve();
          return stopped.promise;
        },
      }),
    ],
  });
  const created = host.caller.session
    .new({
      projectId: 'project-1',
      agent: 'mock',
      checkout: { type: 'worktree', baseBranch: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Start' }],
    })
    .catch((error: unknown): unknown => error);
  await stopping.promise;
  expect(checkoutPath && existsSync(checkoutPath)).toBe(true);
  stopped.resolve();
  expect(await created).toMatchObject({ code: 'PRECONDITION_FAILED' });
  expect(checkoutPath && existsSync(checkoutPath)).toBe(false);
  expect(git('worktree', 'list', '--porcelain')).not.toContain(
    '/.argo/worktrees/',
  );
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toHaveLength(1);
});

it('handles callback initialization failure without launching the native Agent', async (): Promise<void> => {
  vi.useFakeTimers();
  let connects = 0;
  const host = createNativeSessionHost({
    ...createMockAdapter(),
    initialMappingState: (): never => {
      throw new Error('Mapping initialization failed');
    },
    connect: async (): Promise<VendorSession> => {
      connects += 1;
      return {
        ready: mockReady,
        run: async (): Promise<void> => {},
        stop: async (): Promise<void> => {},
      };
    },
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(connects).toBe(0);
  expect(host.session.getSnapshot().matches({ open: 'recovering' })).toBe(true);
});

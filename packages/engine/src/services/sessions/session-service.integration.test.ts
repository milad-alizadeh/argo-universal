import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  AgentConnectInput,
  AgentProbe,
  AgentReady,
  VendorCommand,
} from '@repo/agents';
import type { FeedSubscribeOutput, SessionNewInput } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session, turn } from '@repo/db/schema';
import { sessionBranch } from '@repo/git';
import {
  createMockAdapter,
  type MockAgentScript,
  type MockAgentStream,
  mockReady,
} from '@repo/mocks/agent';
import { newSessionInputs } from '@repo/mocks/app';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import { insertSession, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { initTestRepository } from '#mocks/git';

const agentConfigOptionsChangedEvent = 'agent.configOptionsChanged';
const signInFailure = 'Sign in first';

type SessionTestServer = Omit<
  Awaited<ReturnType<typeof startEngineTestHost>>,
  'databaseWriter' | 'stop'
> & {
  connections: AgentConnectInput[];
  streams: Map<string, MockAgentStream>;
  commands: Map<string, VendorCommand[]>;
  configOptions: Extract<
    AgentReady['configOptions'][number],
    { type: 'select' }
  >[];
  database: Database;
  git: ReturnType<typeof initTestRepository>;
};

const cleanups: (() => void)[] = [];
beforeEach((): void => {
  onTestFinished((): void => {
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  });
});

async function startSessionTestServer({
  applyConfigOptions = true,
} = {}): Promise<SessionTestServer> {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'session-service-')),
  );
  cleanups.push((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = initTestRepository(directory);
  const { database, remove } = openTestDatabase({}, directory);
  cleanups.push(remove);
  const configOptions: SessionTestServer['configOptions'] = [
    {
      configId: 'model',
      name: 'Model',
      category: 'model',
      type: 'select' as const,
      currentValue: 'small',
      options: [
        { value: 'small', name: 'Small' },
        { value: 'large', name: 'Large' },
      ],
    },
  ];
  const connections: AgentConnectInput[] = [];
  const streams = new Map<string, MockAgentStream>();
  const commands = new Map<string, VendorCommand[]>();
  const ready = { ...mockReady, configOptions };
  const script: MockAgentScript = {
    // Starts with the values the Session asks for, as the real adapters do.
    connect: async (input): Promise<typeof ready> => {
      connections.push(input);
      return {
        ...ready,
        configOptions: configOptions.map((option): typeof option => ({
          ...option,
          currentValue: String(
            input.configOptions.find(
              (choice): boolean => choice.configId === option.configId,
            )?.value ?? option.currentValue,
          ),
        })),
      };
    },
    stream: (stream): undefined => {
      streams.set(stream.input.sessionId, stream);
      commands.set(stream.input.sessionId, []);
      stream.receive((command): void => {
        commands.get(stream.input.sessionId)?.push(command);
        if (command.type === 'agent.cancel')
          stream.send({ type: 'agent.turnEnded', stopReason: 'cancelled' });
        if (command.type === 'agent.setConfigOption' && applyConfigOptions) {
          const value = command.value;
          if (typeof value !== 'string')
            throw new Error('Mock select option needs a string value');
          queueMicrotask((): void =>
            stream.send({
              type: agentConfigOptionsChangedEvent,
              configOptions: configOptions.map((option): typeof option => ({
                ...option,
                currentValue: value,
              })),
            }),
          );
        }
      });
    },
  };
  vi.stubEnv('ARGO_PROJECT_PATH', directory);
  cleanups.push((): void => {
    vi.unstubAllEnvs();
  });
  const host = await startEngineTestHost({
    database,
    runtimeDirectory: join(directory, '.argo'),
    adapters: [
      createMockAdapter(script),
      createMockAdapter(
        {
          ...script,
          connect: async (): Promise<AgentReady> => ({
            ...ready,
            configOptions: configOptions.map((option): typeof option => ({
              ...option,
              currentValue: 'large',
            })),
            capabilities: {
              permissionFeedback: true,
              planApproval: 'startTurn',
              stopShell: true,
            },
          }),
        },
        'alternate',
      ),
      createMockAdapter(
        {
          connect: (): Promise<AgentReady> =>
            Promise.reject(new Error(signInFailure)),
          // Signed in when the Server starts, signed out by the first Session.
          probe: vi
            .fn<() => Promise<AgentProbe>>()
            .mockResolvedValueOnce({
              availability: 'available',
              configOptions: [],
            })
            .mockResolvedValue({
              availability: 'not_signed_in',
              installStep: signInFailure,
              configOptions: [],
            }),
        },
        'unavailable',
      ),
    ],
  });
  return {
    ...host,
    connections,
    streams,
    commands,
    configOptions,
    database: host.database,
    git,
  };
}

const newSession: SessionNewInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' },
  configOptions: [{ configId: 'model', value: 'large' }],
  prompt: [{ type: 'text', text: 'Build it\nand test it' }],
};

it('rejects a new Session when the writer keeps its insert queued for retry', async (): Promise<void> => {
  const { caller, database } = await startSessionTestServer();
  database.$client.exec(
    "CREATE TRIGGER reject_session_insert BEFORE INSERT ON session BEGIN SELECT RAISE(ABORT, 'database is locked'); END",
  );
  onTestFinished((): void =>
    database.$client.exec('DROP TRIGGER reject_session_insert'),
  );
  await expect(caller.session.new(newSession)).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: expect.stringContaining(
      'was not stored because the writer is retrying. Retry the Session.',
    ),
  });
});

it('rejects a new Session whose insert is queued behind another retrying job', async (): Promise<void> => {
  const { caller, database } = await startSessionTestServer();
  await caller.session.setConfigOption({
    sessionId: 'session-1',
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  await expect
    .poll(
      () =>
        database.select().from(session).where(eq(session.id, 'session-1')).get()
          ?.configValues,
    )
    .toEqual([{ configId: 'model', value: 'small' }]);
  const rejectedUpdate = Promise.withResolvers<void>();
  database.$client.function('record_rejected_update', () => {
    rejectedUpdate.resolve();
    return 0;
  });
  database.$client.exec(
    "CREATE TRIGGER reject_session_update BEFORE UPDATE ON session BEGIN SELECT record_rejected_update(); SELECT RAISE(ABORT, 'another job cannot be written'); END",
  );
  onTestFinished((): void =>
    database.$client.exec('DROP TRIGGER reject_session_update'),
  );
  await caller.session.setConfigOption({
    sessionId: 'session-1',
    configId: 'model',
    type: 'id',
    value: 'large',
  });
  await rejectedUpdate.promise;
  expect(
    database.select().from(session).where(eq(session.id, 'session-1')).get()
      ?.configValues,
  ).toEqual([{ configId: 'model', value: 'small' }]);
  await expect(caller.session.new(newSession)).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: expect.stringContaining(
      'was not stored because the writer is retrying. Retry the Session.',
    ),
  });
});

it('creates the Checkout, starts the Agent with the chosen options and runs the first Turn in one call', async (): Promise<void> => {
  const { caller, streams, database, commands } =
    await startSessionTestServer();
  const { sessionId } = await caller.session.new({
    ...newSession,
    checkout: { type: 'worktree', baseBranch: 'feature' },
  });
  const stream = streams.get(sessionId);
  expect(stream?.input.configOptions).toEqual([
    { configId: 'model', value: 'large' },
  ]);
  await vi.waitFor((): void =>
    expect(commands.get(sessionId)).toEqual([
      {
        type: 'agent.prompt',
        turnId: expect.any(String),
        content: newSession.prompt,
      },
    ]),
  );
  expect(
    (await caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toEqual([
    expect.objectContaining({
      sessionUpdate: 'user_message',
      content: newSession.prompt,
    }),
  ]);
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toContainEqual(
    expect.objectContaining({
      sessionId,
      agent: 'mock',
      title: 'Build it',
      titleSource: 'prompt',
      checkout: {
        type: 'worktree',
        path: expect.stringContaining(sessionId),
        branch: sessionBranch(sessionId),
      },
    }),
  );
  await vi.waitFor((): void =>
    expect(
      database.select().from(turn).where(eq(turn.sessionId, sessionId)).all(),
    ).toEqual([expect.objectContaining({ status: 'running', model: 'large' })]),
  );
  expect(await caller.projects.list()).toEqual([
    expect.objectContaining({
      checkoutChoice: { type: 'worktree', baseBranch: 'feature' },
    }),
  ]);
});

it.each([{ type: 'main' }, { type: 'worktree', baseBranch: 'main' }] as const)(
  'leaves no Session and no worktree when the Agent cannot start in the $type checkout',
  async (checkout): Promise<void> => {
    const { caller, git } = await startSessionTestServer();
    const readAgentAvailability = async (): Promise<
      | 'available'
      | 'not_installed'
      | 'not_signed_in'
      | 'unavailable'
      | undefined
    > =>
      (await caller.agents.list()).find(
        ({ agent }): boolean => agent === 'unavailable',
      )?.availability;
    expect(await readAgentAvailability()).toBe('available');
    await expect(
      caller.session.new({ ...newSession, agent: 'unavailable', checkout }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining(signInFailure),
    });
    // The failed start probes the Agent again, so the list catches up without a refresh.
    expect(await readAgentAvailability()).toBe('not_signed_in');
    expect(
      (await caller.session.list({ archived: false })).sessions.map(
        (row): string => row.sessionId,
      ),
    ).toEqual(['session-1']);
    expect(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm),
    ).toHaveLength(1);
    expect(git('branch', '--list', 'argo/*')).toBe('');
    expect(await caller.projects.list()).toEqual([
      expect.objectContaining({
        checkoutChoice: { type: 'worktree', baseBranch: 'main' },
      }),
    ]);
  },
);

it('refuses a New Session for an unknown Project, base branch or Agent', async (): Promise<void> => {
  const { caller } = await startSessionTestServer();
  await expect(
    caller.session.new({ ...newSession, projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    caller.session.new({
      ...newSession,
      checkout: { type: 'worktree', baseBranch: 'missing' },
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  await expect(
    caller.session.new({ ...newSession, agent: 'unregistered' }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('lists local branches with the current one, and null when HEAD is detached', async (): Promise<void> => {
  const { caller, git } = await startSessionTestServer();
  expect(await caller.projects.branches({ projectId: 'project-1' })).toEqual({
    branches: ['feature', 'main'],
    currentBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await caller.projects.branches({ projectId: 'project-1' })).toEqual({
    branches: ['feature', 'main'],
    currentBranch: null,
  });
  await expect(
    caller.projects.branches({ projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

it('defaults the checkout choice to a worktree from the current branch, and the main checkout when HEAD is detached', async (): Promise<void> => {
  const { caller, git } = await startSessionTestServer();
  const readCheckoutChoice = async (): Promise<
    { type: 'worktree'; baseBranch: string } | { type: 'main' } | undefined
  > => (await caller.projects.list())[0]?.checkoutChoice;
  expect(await readCheckoutChoice()).toEqual({
    type: 'worktree',
    baseBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await readCheckoutChoice()).toEqual({ type: 'main' });
});

it('returns the chosen config value and delivers later Agent changes through the Feed', async (): Promise<void> => {
  const { caller, streams, configOptions, createCaller } =
    await startSessionTestServer({
      applyConfigOptions: false,
    });
  const sessionId = 'session-1';
  await caller.session.setConfigOption({
    sessionId,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  const controller = new AbortController();
  cleanups.push((): void => controller.abort());
  const updates = await createCaller({
    signal: controller.signal,
  }).feed.subscribe({ sessionId, after: null });
  const iterator = updates[Symbol.asyncIterator]();
  await iterator.next();
  expect(
    await caller.session.setConfigOption({
      sessionId,
      configId: 'model',
      type: 'id',
      value: 'large',
    }),
  ).toMatchObject({
    configOptions: [{ configId: 'model', currentValue: 'large' }],
  });
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ currentValue: 'large' }] },
  });
  const stream = streams.get(sessionId);
  stream?.send({
    type: agentConfigOptionsChangedEvent,
    configOptions: configOptions.map((option): typeof option => ({
      ...option,
      name: 'Renamed',
    })),
  });
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ name: 'Renamed', currentValue: 'small' }] },
  });
  stream?.send({
    type: agentConfigOptionsChangedEvent,
    configOptions: configOptions.map((option): typeof option => ({
      ...option,
      currentValue: 'large',
    })),
  });
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ currentValue: 'large' }] },
  });
  controller.abort();
  await iterator.return?.();
});

it('prompts and cancels through tRPC, with the same Session reopened only once', async (): Promise<void> => {
  const { caller, streams, connections } = await startSessionTestServer();
  const { messageId } = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Hello' }],
  });
  const stream = streams.get('session-1');
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: messageId }),
  ).toMatchObject({ content: [{ type: 'text', text: 'Hello' }] });
  await expect(
    caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Again' }],
    }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringContaining('running'),
  });
  expect(await caller.session.cancel({ sessionId: 'session-1' })).toEqual({});
  const next = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'After cancel' }],
  });
  expect(next.messageId).not.toBe(messageId);
  expect(streams.get('session-1')).toBe(stream);
  expect(connections).toHaveLength(1);
});

it('rejects unknown Sessions and input that breaks the contract', async (): Promise<void> => {
  const { caller } = await startSessionTestServer();
  await expect(
    caller.session.prompt({
      sessionId: 'missing',
      prompt: [{ type: 'text', text: 'Hello' }],
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    caller.session.prompt({ sessionId: 'session-1', prompt: [] }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('reads a stored Session snapshot without connecting an Agent when its Feed is subscribed', async (): Promise<void> => {
  const { connections, createCaller } = await startSessionTestServer();
  expect(connections).toEqual([]);
  const controller = new AbortController();
  cleanups.push((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
  const updates = await caller.feed.subscribe({
    sessionId: 'session-1',
    after: null,
  });
  const iterator = updates[Symbol.asyncIterator]();
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [] },
  });
  expect(connections).toEqual([]);
  controller.abort();
  await iterator.return?.();
});

it('removes a closed Session and resumes it with the stored Agent identity on the next prompt', async (): Promise<void> => {
  const { caller, connections, streams } = await startSessionTestServer();
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'First' }],
  });
  await caller.session.cancel({ sessionId: 'session-1' });
  await caller.session.close({ sessionId: 'session-1' });
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  expect(streams.get('session-1')?.input.vendorSessionId).toBe('vendor-1');
  expect(
    connections.map(({ sessionId, vendorSessionId }) => ({
      sessionId,
      vendorSessionId,
    })),
  ).toEqual([
    { sessionId: 'session-1', vendorSessionId: null },
    { sessionId: 'session-1', vendorSessionId: 'vendor-1' },
  ]);
});

it('resumes a closed Session with the config it last ran with', async (): Promise<void> => {
  const { caller, streams } = await startSessionTestServer();
  const { sessionId } = await caller.session.new(newSession);
  await caller.session.cancel({ sessionId });
  expect(
    await caller.session.setConfigOption({
      sessionId,
      configId: 'model',
      type: 'id',
      value: 'small',
    }),
  ).toMatchObject({
    configOptions: [{ configId: 'model', currentValue: 'small' }],
  });
  await caller.session.close({ sessionId });
  await caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  expect(streams.get(sessionId)?.input.configOptions).toEqual([
    { configId: 'model', value: 'small' },
  ]);
});

it('refuses commands for a Subagent while keeping its stored Feed readable', async (): Promise<void> => {
  const { caller, connections, database } = await startSessionTestServer();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  await expect(
    caller.session.prompt({
      sessionId: 'subagent',
      prompt: [{ type: 'text', text: 'Start' }],
    }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'A Subagent is read-only',
  });
  expect(
    await caller.feed.page({ sessionId: 'subagent', direction: 'tail' }),
  ).toMatchObject({ rows: [] });
  expect(connections).toEqual([]);
});

it('rejects config choices that the Agent did not offer', async (): Promise<void> => {
  const { caller } = await startSessionTestServer();
  await expect(
    caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'model',
      type: 'id',
      value: 'missing',
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('keeps the Session failure when the registry removes a Session during its Feed subscription', async (): Promise<void> => {
  vi.useFakeTimers();
  cleanups.push((): void => {
    vi.useRealTimers();
  });
  const { caller, streams } = await startSessionTestServer();
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start a Turn' }],
  });
  const updates = (
    await caller.feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  await updates.next();
  for (let index = 0; index < 3; index++) {
    const stream = streams.get('session-1');
    if (!stream) throw new Error('No Agent stream');
    stream.fail(new Error('Agent crashed'));
    await vi.advanceTimersByTimeAsync(index === 2 ? 0 : 1000);
  }
  let last: FeedSubscribeOutput | undefined;
  for await (const event of {
    [Symbol.asyncIterator]: (): typeof updates => updates,
  })
    last = event;
  expect(last).toEqual({
    type: 'closed',
    failure: 'The Agent stopped three times in ten minutes',
  });
});

it('rejects a Permission answer for a different Tool call through the router', async (): Promise<void> => {
  const { caller, streams } = await startSessionTestServer();
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start' }],
  });
  streams.get('session-1')?.send({
    type: 'agent.permissionRequested',
    request: {
      toolCallId: 'current-tool',
      title: 'Run a command',
      options: permissionOptions,
    },
  });
  await expect(
    caller.session.answerPermission({
      sessionId: 'session-1',
      toolCallId: 'stale-tool',
      optionId: 'allow_once',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: 'already answered' });
});

it.each(newSessionInputs)(
  'creates an image prompt Session from the $agent App mock through the real router',
  async (input): Promise<void> => {
    const { caller, streams, commands } = await startSessionTestServer();
    const configOptions = [{ configId: 'fast', value: true }];
    const { sessionId } = await caller.session.new({
      ...newSession,
      prompt: input.prompt,
      configOptions,
    });
    expect(streams.get(sessionId)?.input.configOptions).toEqual(configOptions);
    await vi.waitFor((): void =>
      expect(commands.get(sessionId)).toContainEqual({
        type: 'agent.prompt',
        turnId: expect.any(String),
        content: input.prompt,
      }),
    );
    expect(
      (await caller.feed.page({ sessionId, direction: 'tail' })).rows,
    ).toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'user_message',
        content: input.prompt,
      }),
    );
  },
);

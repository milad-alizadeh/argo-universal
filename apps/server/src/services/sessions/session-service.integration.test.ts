import { randomUUID } from 'node:crypto';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentProbe, VendorCommand } from '@repo/agents';
import { appRouter } from '@repo/api';
import type { FeedSubscribeOutput, SessionNewInput } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { sessionBranch } from '@repo/git';
import {
  createMockAdapter,
  type MockAgentScript,
  type MockAgentStream,
  mockReady,
} from '@repo/mocks/agent';
import { eq } from 'drizzle-orm';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise, setup, waitFor } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { initTestRepository } from '#mocks/git';
import { writerMachine } from '../feed';
import { createServerServices } from '../server-services';
import { registryMachine } from './registry-machine';

const agentConfigOptionsChangedEvent = 'agent.configOptionsChanged';
const signInFailure = 'Sign in first';
const sessionActorId = 'session:session-1';

type TestServer = {
  caller: ReturnType<typeof appRouter.createCaller>;
  root: import('xstate').Actor<
    import('xstate').StateMachine<
      import('xstate').MachineContext,
      import('xstate').AnyEventObject,
      {
        [x: string]:
          | import('xstate').ActorRefFromLogic<
              typeof registryMachine | typeof writerMachine
            >
          | undefined;
      },
      | {
          src: 'sessions';
          logic: typeof registryMachine;
          id: string | undefined;
        }
      | { src: 'writer'; logic: typeof writerMachine; id: string | undefined },
      never,
      never,
      never,
      Record<never, never>,
      string,
      import('xstate').NonReducibleUnknown,
      import('xstate').NonReducibleUnknown,
      import('xstate').EventObject,
      import('xstate').MetaObject,
      Record<never, never>,
      import('xstate').MetaObject
    >
  >;
  streams: Map<string, MockAgentStream>;
  commands: Map<string, VendorCommand[]>;
  configOptions: {
    configId: string;
    name: string;
    category: string;
    type: 'select';
    currentValue: string;
    options: { value: string; name: string }[];
  }[];
  services: import('@repo/api').Services;
  database: import('@repo/db').Database;
  git: (...arguments_: string[]) => string;
};
type AlternateReady = typeof mockReady & {
  configOptions: TestServer['configOptions'];
  capabilities: { planApproval: 'startTurn' };
};

const cleanups: (() => void)[] = [];
afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function openServer({
  applyConfigOptions = true,
  writer = writerMachine,
} = {}): TestServer {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'session-service-')),
  );
  cleanups.push((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = initTestRepository(directory);
  const { database, remove } = openTestDatabase({}, directory);
  cleanups.push(remove);
  const configOptions = [
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
  const streams = new Map<string, MockAgentStream>();
  const commands = new Map<string, VendorCommand[]>();
  const ready = { ...mockReady, configOptions };
  const script: MockAgentScript = {
    // Starts with the values the Session asks for, as the real adapters do.
    connect: async (input): Promise<typeof ready> => ({
      ...ready,
      configOptions: configOptions.map((option): typeof option => ({
        ...option,
        currentValue: String(
          input.configOptions.find(
            (choice): boolean => choice.configId === option.configId,
          )?.value ?? option.currentValue,
        ),
      })),
    }),
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
  const root = createActor(
    setup({
      actors: { sessions: registryMachine, writer },
    }).createMachine({
      invoke: [
        {
          src: 'writer',
          systemId: 'databaseWriter',
          input: {
            now: (): number => Date.now(),
            database,
          },
        },
        {
          src: 'sessions',
          systemId: 'sessions',
          input: {
            now: (): number => Date.now(),
            createId: randomUUID,
            database,
            runtimeDirectory: join(directory, '.argo'),
            adapters: [
              createMockAdapter(script),
              createMockAdapter(
                {
                  ...script,
                  connect: async (): Promise<AlternateReady> => ({
                    ...ready,
                    configOptions: configOptions.map(
                      (option): typeof option => ({
                        ...option,
                        currentValue: 'large',
                      }),
                    ),
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
                  connect: (): Promise<import('@repo/agents').AgentReady> =>
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
          },
        },
      ],
    }),
  ).start();
  cleanups.push((): typeof root => root.stop());
  const sessions = root.system.get('sessions');
  const services = createServerServices({
    database,
    // These tests never upload, so no blob reaches the folder.
    blobsFolder: '/no-uploads',
    sessions,
    version: '1',
    startedAt: new Date().toISOString(),
  });
  const caller = appRouter.createCaller({ services });
  return {
    caller,
    root,
    streams,
    commands,
    configOptions,
    services,
    database,
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
  const writer = writerMachine.provide({
    actors: {
      writeBatch: fromPromise(async (): Promise<void> => {
        throw new Error('database is locked');
      }),
    },
    delays: { writeRetryDelay: 60_000 },
    actions: { log: (): void => {} },
  });
  const { caller } = openServer({ writer });
  await expect(caller.session.new(newSession)).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: expect.stringContaining(
      'was not stored because the writer is retrying. Retry the Session.',
    ),
  });
});

it('rejects a new Session whose insert is queued behind another retrying job', async (): Promise<void> => {
  const retryReported = vi.fn();
  const writer = writerMachine.provide({
    actors: {
      writeBatch: fromPromise(async (): Promise<void> => {
        throw new Error('another job cannot be written');
      }),
    },
    delays: { writeRetryDelay: 60_000 },
    actions: { log: (): ReturnType<typeof retryReported> => retryReported() },
  });
  const { caller, root } = openServer({ writer });
  const databaseWriter = root.system.get('databaseWriter');
  databaseWriter.send({
    type: 'writer.write',
    job: { type: 'turnUpdate', id: 'other-turn', set: { endedAt: 1 } },
  });
  await vi.waitFor((): void => expect(retryReported).toHaveBeenCalledOnce());
  await expect(caller.session.new(newSession)).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: expect.stringContaining(
      'was not stored because the writer is retrying. Retry the Session.',
    ),
  });
});

it('creates the Checkout, starts the Agent with the chosen options and runs the first Turn in one call', async (): Promise<void> => {
  const { caller, streams, database, commands } = openServer();
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
    const { caller, git } = openServer();
    const availability = async (): Promise<
      | 'available'
      | 'not_installed'
      | 'not_signed_in'
      | 'unavailable'
      | undefined
    > =>
      (await caller.agents.list()).find(
        ({ agent }): boolean => agent === 'unavailable',
      )?.availability;
    expect(await availability()).toBe('available');
    await expect(
      caller.session.new({ ...newSession, agent: 'unavailable', checkout }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining(signInFailure),
    });
    // The failed start probes the Agent again, so the list catches up without a refresh.
    expect(await availability()).toBe('not_signed_in');
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
  const { caller } = openServer();
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
  const { caller, git } = openServer();
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
  const { caller, git } = openServer();
  const checkoutChoice = async (): Promise<
    { type: 'worktree'; baseBranch: string } | { type: 'main' } | undefined
  > => (await caller.projects.list())[0]?.checkoutChoice;
  expect(await checkoutChoice()).toEqual({
    type: 'worktree',
    baseBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await checkoutChoice()).toEqual({ type: 'main' });
});

it('returns the chosen config value and delivers later Agent changes through the Feed', async (): Promise<void> => {
  const { caller, root, streams, configOptions, services } = openServer({
    applyConfigOptions: false,
  });
  const sessionId = 'session-1';
  root.system.get('sessions').send({
    type: 'sessions.open',
    sessionId,
    agent: 'mock',
  });
  await waitFor(root.system.get(`session:${sessionId}`), (snapshot): boolean =>
    snapshot.can({ type: 'session.prompt', turnId: 'ready', content: [] }),
  );
  const controller = new AbortController();
  cleanups.push((): void => controller.abort());
  const updates = services.feed.subscribe(
    { sessionId, after: null },
    controller.signal,
  );
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
  const { caller, streams } = openServer();
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
});

it('rejects unknown Sessions and input that breaks the contract', async (): Promise<void> => {
  const { caller } = openServer();
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

it('reads a stored Session snapshot without opening an actor when its Feed is subscribed', async (): Promise<void> => {
  const { root, services } = openServer();
  expect(root.system.get(sessionActorId)).toBeUndefined();
  const controller = new AbortController();
  cleanups.push((): void => controller.abort());
  const caller = appRouter.createCaller(
    { services },
    { signal: controller.signal },
  );
  const updates = await caller.feed.subscribe({
    sessionId: 'session-1',
    after: null,
  });
  const iterator = updates[Symbol.asyncIterator]();
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [] },
  });
  expect(root.system.get(sessionActorId)).toBeUndefined();
  controller.abort();
  await iterator.return?.();
});

it('removes a closed Session and resumes it with the stored Agent identity on the next prompt', async (): Promise<void> => {
  const { caller, root, streams } = openServer();
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'First' }],
  });
  await caller.session.cancel({ sessionId: 'session-1' });
  const first = root.system.get(sessionActorId);
  first.send({ type: 'session.close' });
  await waitFor(first, (snapshot): boolean => snapshot.status === 'done');
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  expect(streams.get('session-1')?.input.vendorSessionId).toBe('vendor-1');
  expect(root.system.get(sessionActorId)).not.toBe(first);
});

it('resumes a closed Session with the config it last ran with', async (): Promise<void> => {
  const { caller, root, streams } = openServer();
  const { sessionId } = await caller.session.new(newSession);
  await caller.session.cancel({ sessionId });
  await caller.session.setConfigOption({
    sessionId,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  const first = root.system.get(`session:${sessionId}`);
  await vi.waitFor((): void =>
    expect(first.getSnapshot().context.configOptions).toMatchObject([
      { currentValue: 'small' },
    ]),
  );
  first.send({ type: 'session.close' });
  await waitFor(first, (snapshot): boolean => snapshot.status === 'done');
  await caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  expect(streams.get(sessionId)?.input.configOptions).toEqual([
    { configId: 'model', value: 'small' },
  ]);
});

it('refuses commands for a Subagent while keeping its stored Feed readable', async (): Promise<void> => {
  const { caller, root, database } = openServer();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  await expect(
    caller.session.cancel({ sessionId: 'subagent' }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'A Subagent is read-only',
  });
  expect(
    await caller.feed.page({ sessionId: 'subagent', direction: 'tail' }),
  ).toMatchObject({ rows: [] });
  expect(root.system.get('session:subagent')).toBeUndefined();
});

it('rejects config choices that the Agent did not offer', async (): Promise<void> => {
  const { caller } = openServer();
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
  const { caller, streams } = openServer();
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

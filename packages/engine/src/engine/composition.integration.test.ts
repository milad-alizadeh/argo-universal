import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type AgentAdapter, agentAdapters } from '@repo/agents';
import type { FeedSubscribeOutput, SessionSnapshot } from '@repo/contracts';
import type { SessionInfo } from '@repo/contracts';
import type { SessionListUpdate, SessionUpdate } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { listBranches } from '@repo/git';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { createAppFixtureProcessLauncher } from '@repo/mocks/agent/acp-fixtures';
import { createAppFixtureAdapter } from '@repo/mocks/agent/app-fixtures';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import type { Actor, ActorRefFrom } from 'xstate';
import { createActor, fromCallback, fromPromise, waitFor } from 'xstate';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { initTestRepository } from '#mocks/git';
import { liveHeaderMocks } from '#mocks/live-header';
import { feedMachine } from '../services/feed';
import { type WriterJob, writeJobs } from '../services/feed';
import { writerMachine, findDatabaseWriter } from '../services/feed';
import { registryMachine, sessionMachine } from '../services/sessions';
import { createEngineContext, type Context } from './context';
import type { HttpServerOptions } from './http-server';
import { engineMachine, type EngineInput } from './machine';
import { appRouter } from './router';

const missingWriterMessage = 'Writer actor is missing';
const engineStopEvent = 'engine.stop';
const agentFeedEvent = 'agent.feed';
const checkingTestsStatus = 'Checking the tests';
const retryingStatus = 'Retrying (2 of 5)';
const rejectedSessionListLog = 'sessions: rejected list shape #1';
const writerWriteEvent = 'writer.write';
const changedAloneTitle = 'Changed alone';
const brokenSessionId = 'session-broken';

type StoredColumnCase<Table, Column> = {
  agent: string;
  table: Table;
  column: Column;
  id: string;
  field: string;
};
type StoredColumnCases = [
  StoredColumnCase<typeof session, typeof session.configValues>,
  StoredColumnCase<typeof session, typeof session.vendorRef>,
  StoredColumnCase<typeof turn, typeof turn.usage>,
  StoredColumnCase<typeof turn, typeof turn.error>,
];
type FeedColumnCase = {
  agent: string;
  kind: 'agent_message' | 'agent_thought' | 'tool_call_update';
  field: string;
  column: typeof feedRow.payload | typeof feedRow.sourceRef;
};

type StartedEngine = {
  engine: Actor<typeof engineMachine>;
  createCaller: (
    signal?: AbortSignal,
  ) => Promise<ReturnType<typeof appRouter.createCaller>>;
};

type MalformedFeedCase = {
  agent: AgentAdapter['agent'];
  kind: Extract<
    SessionUpdate['sessionUpdate'],
    'agent_message' | 'agent_thought' | 'plan_update'
  >;
};

// The longest the teardown waits for the Engine's graceful stop.
const gracefulStopLimit = 5_000;

// An Engine on a mock Agent; without `database` it opens and closes its real database in `home`. It stops itself when the test ends.
function startEngine({
  database,
  adapter,
  home = '/unused',
  closeDatabase = (): void => {},
  sessions = registryMachine,
  databaseWriter = writerMachine,
  acpComposition,
}: {
  database?: ReturnType<typeof openTestDatabase>['database'];
  adapter: AgentAdapter;
  home?: string;
  closeDatabase?: () => void;
  sessions?: typeof registryMachine;
  databaseWriter?: typeof writerMachine;
  acpComposition?: Pick<EngineInput, 'acp' | 'resolveAgentLaunch'>;
}): StartedEngine {
  let context: Context | undefined;
  const machine = engineMachine.provide({
    actors: {
      ...(database && {
        openDatabase: fromPromise(async (): Promise<Database> => database),
      }),
      processSignals: fromCallback((): void => {}),
      sessions,
      databaseWriter,
      startHttpServer: fromPromise(
        async ({
          input,
        }: {
          input: HttpServerOptions;
        }): Promise<{ close: () => Promise<void> }> => {
          context = createEngineContext({
            ...input,
            blobsFolder: path.join(input.home, 'blobs'),
          });
          return { close: async (): Promise<void> => {} };
        },
      ),
    },
    actions: {
      log: (): void => {},
      sendToSupervisor: (): void => {},
      ...(database && { closeDatabase }),
    },
  });
  const engine = createActor(machine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      home,
      port: 7337,
      version: '1',
      startedAt: new Date().toISOString(),
      adapters: [adapter],
      ...acpComposition,
    },
  }).start();
  onTestFinished(async (): Promise<void> => {
    // Fake timers would leave the wait hanging.
    vi.useRealTimers();
    try {
      if (engine.getSnapshot().status !== 'done') {
        engine.send({ type: engineStopEvent, reason: 'SIGTERM' });
        await waitFor(
          engine,
          (
            snapshot,
          ): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
            snapshot.status === 'done',
          {
            timeout: gracefulStopLimit,
          },
        ).catch((): never => {
          throw new Error(
            `The Engine's graceful stop did not finish within ${gracefulStopLimit} ms`,
          );
        });
      }
    } finally {
      engine.stop();
    }
  });
  return {
    engine,
    createCaller: async (
      signal?: AbortSignal,
    ): Promise<ReturnType<typeof appRouter.createCaller>> => {
      await waitFor(engine, (snapshot): boolean =>
        snapshot.matches({ live: 'running' }),
      );
      if (!context) throw new Error('No Engine context');
      return appRouter.createCaller(context, { signal });
    },
  };
}

it.each(liveHeaderMocks)(
  'shares live header and list activity for $agent after Feed writes',
  async ({ command, thought, retry, progress }): Promise<void> => {
    const { database, remove } = openTestDatabase();
    onTestFinished(remove);
    let stream: MockAgentStream | undefined;
    const adapter = createMockAdapter({
      stream: (current): undefined => {
        stream = current;
      },
    });
    const { createCaller } = startEngine({ database, adapter });
    const controller = new AbortController();
    onTestFinished((): void => controller.abort());
    const caller = await createCaller(controller.signal);
    await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Check tests' }],
    });
    const subscription = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    const expectActivity = async (expected: string): Promise<void> => {
      await expect
        .poll(
          async (): Promise<string | undefined> =>
            (await caller.session.list({ archived: false })).sessions[0]
              ?.activity,
        )
        .toBe(expected);
      for (;;) {
        const next = await subscription.next();
        if (next.done) throw new Error('Feed subscription ended');
        if (
          next.value.type === 'snapshot' &&
          next.value.snapshot.liveHeader?.text === expected
        )
          break;
      }
    };
    const sendRow = (row: SessionUpdate): void => {
      const {
        sessionId: _sessionId,
        turnId: _turnId,
        position: _position,
        revision: _revision,
        ...update
      } = row;
      stream?.send({
        type: agentFeedEvent,
        change: { type: 'upsert', update },
      });
    };
    await expectActivity('Working');
    sendRow({
      ...command,
      title: '',
      kind: 'execute',
      content: [{ type: 'terminal', command: 'pnpm test', output: '' }],
      _meta: undefined,
    });
    await expectActivity('Running pnpm test');
    sendRow(thought);
    await expectActivity(checkingTestsStatus);
    sendRow(retry);
    await expectActivity(retryingStatus);
    // Settled rows have left the Feed actor by now; a fresh subscription must retain the retry.
    const reconnect = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    expect((await reconnect.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        liveHeader: {
          text: retryingStatus,
          source: { type: 'retry' },
          startedAt: expect.any(Number),
        },
      },
    });
    for (const row of progress) {
      sendRow(retry);
      await expectActivity(retryingStatus);
      sendRow(row);
      await expect
        .poll(async (): Promise<boolean> =>
          (
            await caller.feed.page({
              sessionId: 'session-1',
              direction: 'tail',
            })
          ).rows.some((stored): boolean => stored.id === row.id),
        )
        .toBe(true);
      await expectActivity(checkingTestsStatus);
    }
    sendRow({ ...command, status: 'completed', state: 'settled' });
    await expectActivity(checkingTestsStatus);
    stream?.send({
      type: 'agent.permissionRequested',
      request: {
        toolCallId: command.toolCallId,
        title: 'Allow tests?',
        options: permissionOptions,
      },
    });
    expect(
      (await caller.session.list({ archived: false })).sessions[0]?.activity,
    ).toBe('Allow tests?');
    stream?.send({ type: 'agent.turnEnded', stopReason: 'end_turn' });
    await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Next Turn' }],
    });
    await expectActivity('Working');
    controller.abort();
    await subscription.return?.();
    await reconnect.return?.();
  },
);

it('keeps the Feed subscription open after malformed stored activity', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (current): undefined => {
      stream = current;
    },
  });
  const { createCaller } = startEngine({ database, adapter });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = await createCaller(controller.signal);
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Check tests' }],
  });
  const subscription = (
    await caller.feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  const initial = (await subscription.next()).value;
  if (initial?.type !== 'snapshot')
    throw new Error('Expected initial snapshot');
  database
    .insert(feedRow)
    .values({
      sessionId: 'session-1',
      id: 'malformed',
      position: 500,
      revision: 500,
      turnId: initial.snapshot.activeTurnId,
      state: 'settled',
      sessionUpdate: 'agent_thought',
      payloadVersion: 1,
      payload: { messageId: 'malformed', content: 'invalid' },
    })
    .run();
  const reported = vi
    .spyOn(console, 'error')
    .mockImplementation((): void => {});
  onTestFinished((): void => reported.mockRestore());
  const next = subscription.next();
  stream?.send({ type: 'agent.usage', usage: { used: 10, size: 100 } });
  await expect(next).resolves.toMatchObject({
    done: false,
    value: {
      type: 'snapshot',
      snapshot: {
        usage: { used: 10, size: 100 },
        liveHeader: { text: 'Working', source: { type: 'working' } },
      },
    },
  });
  expect(reported).toHaveBeenCalledWith(
    'sessions: rejected live-header shape #1',
    expect.anything(),
  );
  const following = subscription.next();
  stream?.send({ type: 'agent.usage', usage: { used: 11, size: 100 } });
  await expect(following).resolves.toMatchObject({
    done: false,
    value: { type: 'snapshot', snapshot: { usage: { used: 11, size: 100 } } },
  });
  await expect(
    caller.feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 50,
    }),
  ).rejects.toThrow();
  const catchUp = (
    await caller.feed.subscribe({
      sessionId: 'session-1',
      after: { epoch: initial.snapshot.epoch, revision: 0 },
    })
  )[Symbol.asyncIterator]();
  await expect(catchUp.next()).rejects.toThrow();
});

it.each(
  agentAdapters.flatMap(({ agent }): MalformedFeedCase[] =>
    (['agent_message', 'plan_update', 'agent_thought'] as const).map(
      (kind): MalformedFeedCase => ({ agent, kind }),
    ),
  ),
)(
  'degrades only the Session with a malformed $kind row for $agent',
  async ({ agent, kind }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const { createCaller } = startEngine({
      database,
      adapter: createMockAdapter({}, agent),
    });
    const caller = await createCaller();
    insertSession(database, { id: 'healthy', agent });
    database
      .insert(turn)
      .values({ id: 'running', sessionId: 'session-1', status: 'running' })
      .run();
    database
      .insert(feedRow)
      .values([
        {
          sessionId: 'healthy',
          id: 'reply',
          position: 0,
          revision: 1,
          state: 'settled',
          sessionUpdate: 'agent_message',
          payloadVersion: 1,
          payload: {
            messageId: 'reply',
            content: [{ type: 'text', text: 'Healthy reply' }],
          },
        },
        {
          sessionId: 'session-1',
          id: 'bad',
          turnId: 'running',
          position: 0,
          revision: 1,
          state: 'settled',
          sessionUpdate: kind,
          payloadVersion: 1,
          payload: { messageId: 'bad', content: 'invalid', plan: 'invalid' },
        },
      ])
      .run();
    const result = await caller.session.list({ archived: false });
    expect(result.sessions).toHaveLength(2);
    expect(
      result.sessions.find((row): boolean => row.sessionId === 'session-1'),
    ).toMatchObject({ activity: '', plan: null });
    expect(
      result.sessions.find((row): boolean => row.sessionId === 'healthy'),
    ).toMatchObject({ activity: 'Healthy reply' });
    expect(
      reported.mock.calls.some(([message]): boolean =>
        String(message).includes('rejected'),
      ),
    ).toBe(true);
  },
);

it.each(agentAdapters.map(({ agent }): string => agent))(
  'drops only a malformed Session for %s',
  async (agent): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const { createCaller } = startEngine({
      database,
      adapter: createMockAdapter({}, agent),
    });
    const caller = await createCaller();
    insertSession(database, { id: 'healthy', agent });
    database
      .update(session)
      .set({ titleSource: sql`'invalid'` })
      .where(eq(session.id, 'session-1'))
      .run();
    const result = await caller.session.list({ archived: false });
    expect(result.sessions.map((row): string => row.sessionId)).toEqual([
      'healthy',
    ]);
    expect(reported).toHaveBeenCalledWith(
      rejectedSessionListLog,
      expect.anything(),
    );
  },
);

it.each(agentAdapters.map(({ agent }): string => agent))(
  'drops only the Session with a malformed Turn for %s',
  async (agent): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const { createCaller } = startEngine({
      database,
      adapter: createMockAdapter({}, agent),
    });
    const caller = await createCaller();
    insertSession(database, { id: 'healthy', agent });
    database
      .insert(turn)
      .values({
        id: 'bad-turn',
        sessionId: 'session-1',
        status: 'ended',
        usage: { totalTokens: 'invalid' },
      })
      .run();
    const result = await caller.session.list({ archived: false });
    expect(result.sessions.map((row): string => row.sessionId)).toEqual([
      'healthy',
    ]);
    expect(reported).toHaveBeenCalledWith(
      rejectedSessionListLog,
      expect.anything(),
    );
  },
);

it('serves live Session procedures and drains their Feed before closing the database', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  let closedDatabase = false;
  const adapter = createMockAdapter({
    stream: (stream): undefined => {
      stream.receive((command): void => {
        if (command.type === 'agent.prompt')
          stream.send({
            type: agentFeedEvent,
            change: {
              type: 'upsert',
              update: {
                id: 'reply',
                sessionUpdate: 'agent_message',
                state: 'open',
                messageId: 'reply',
                content: [{ type: 'text', text: 'Hello from the Agent' }],
              },
            },
          });
      });
    },
  });
  const { engine, createCaller } = startEngine({
    database,
    adapter,
    closeDatabase: (): void => {
      closedDatabase = true;
    },
  });
  const caller = await createCaller();
  const { messageId } = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Hi' }],
  });
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: messageId }),
  ).toMatchObject({ sessionUpdate: 'user_message' });
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: 'reply' }),
  ).toMatchObject({
    content: [{ type: 'text', text: 'Hello from the Agent' }],
  });
  engine.send({ type: engineStopEvent, reason: 'SIGTERM' });
  await waitFor(
    engine,
    (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
      snapshot.status === 'done',
  );
  expect(closedDatabase).toBe(true);
  expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(
    await caller.feed.page({ sessionId: 'session-1', direction: 'tail' }),
  ).toMatchObject({ rows: [{ id: messageId }, { id: 'reply' }] });
});

it('lists only top-level Sessions, searches literal titles, filters archives and pages tied activity', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({
    title: 'Earlier',
    activityAt: 1,
  });
  onTestFinished(remove);
  for (let index = 0; index < 51; index += 1)
    insertSession(database, {
      id: `page-${String(index).padStart(2, '0')}`,
      title: 'Search %_ title',
      activityAt: 10,
    });
  insertSession(database, {
    id: 'archived',
    title: 'Archived title',
    archivedAt: 2,
    activityAt: 20,
  });
  insertSession(database, {
    id: 'subagent',
    parentSessionId: 'session-1',
    title: 'Search %_ title',
    activityAt: 30,
  });
  const { createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  const caller = await createCaller();
  const first = await caller.session.list({ archived: false, query: '%_' });
  expect(first.sessions).toHaveLength(50);
  expect(first.sessions[0]?.sessionId).toBe('page-50');
  expect(first.nextCursor).not.toBeNull();
  const second = await caller.session.list({
    archived: false,
    query: '%_',
    cursor: first.nextCursor ?? undefined,
  });
  expect(second.sessions.map((row): string => row.sessionId)).toEqual([
    'page-00',
  ]);
  expect(second.nextCursor).toBeNull();
  expect(
    (await caller.session.list({ archived: true })).sessions.map(
      (row): string => row.sessionId,
    ),
  ).toEqual(['archived']);
  expect(
    (await caller.session.list({ archived: false, projectId: 'missing' }))
      .sessions,
  ).toEqual([]);
  await expect(
    caller.session.list({ archived: false, cursor: 'bad' }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('sends live list changes and attention/running counts through request and Turn transitions', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'archived', archivedAt: 1, maxRevision: 1 });
  insertSession(database, {
    id: 'subagent',
    parentSessionId: 'session-1',
    maxRevision: 1,
  });
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (current): undefined => {
      stream = current;
    },
  });
  const { engine, createCaller } = startEngine({ database, adapter });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = await createCaller(controller.signal);
  const counts = (await caller.session.counts())[Symbol.asyncIterator]();
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { sessionId: 'session-1', status: 'idle' },
  });
  const writer =
    findDatabaseWriter(engine.system) ??
    expect.unreachable(missingWriterMessage);
  for (const sessionId of ['archived', 'subagent'])
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'turnInsert',
        turn: { id: `turn-${sessionId}`, sessionId, status: 'running' },
      },
    });
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Hello' }],
  });
  expect((await counts.next()).value).toEqual({ attention: 0, running: 1 });
  expect(stream).toBeDefined();
  stream?.send({
    type: 'agent.permissionRequested',
    request: {
      toolCallId: 'permission',
      title: 'Run a command',
      options: permissionOptions,
    },
  });
  expect((await counts.next()).value).toEqual({ attention: 1, running: 1 });
  const pending = await caller.session.list({ archived: false });
  expect(pending.sessions[0]).toMatchObject({
    status: 'needs_input',
    activity: 'Run a command',
  });
  stream?.send({
    type: agentFeedEvent,
    change: {
      type: 'upsert',
      update: {
        id: 'answer',
        sessionUpdate: 'agent_message',
        state: 'settled',
        messageId: 'answer',
        content: [{ type: 'text', text: 'All done\nDetails' }],
      },
    },
  });
  stream?.send({ type: 'agent.turnEnded', stopReason: 'end_turn' });
  expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
  await expect
    .poll(
      async (): Promise<SessionInfo | undefined> =>
        (await caller.session.list({ archived: false })).sessions[0],
    )
    .toMatchObject({
      status: 'unread',
      activity: 'All done',
      activityAt: expect.any(Number),
    });
  let newest: SessionListUpdate | undefined;
  do {
    const next = await updates.next();
    if (next.done) throw new Error('List subscription ended');
    newest = next.value;
  } while (
    newest?.type !== 'changed' ||
    newest.session.status !== 'unread' ||
    newest.session.activity !== 'All done'
  );
  expect(newest.session.activity).toBe('All done');
  controller.abort();
  await counts.return?.();
  await updates.return?.();
});

it('seeds the Project from ARGO_PROJECT_PATH at Engine startup', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'argo-seed-')),
  );
  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  vi.stubEnv('ARGO_PROJECT_PATH', process.cwd());
  const { engine, createCaller } = startEngine({
    adapter: createMockAdapter(),
    home: directory,
  });
  const caller = await createCaller();
  const projects = await caller.projects.list();
  expect(projects).toHaveLength(1);
  // CI checks out a detached HEAD, which defaults to the main checkout.
  const { currentBranch } = await listBranches(process.cwd());
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();
  expect(projects[0]).toMatchObject({
    name: path.basename(root),
    checkoutChoice:
      currentBranch === null
        ? { type: 'main' }
        : { type: 'worktree', baseBranch: currentBranch },
  });
  engine.send({ type: engineStopEvent, reason: 'SIGTERM' });
  await waitFor(
    engine,
    (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
      snapshot.status === 'done',
  );
});

it('uses the newest Turn for failures and excludes interrupted Turns from Failed', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({ maxRevision: 2 });
  onTestFinished(remove);
  insertSession(database, { id: 'interrupted', maxRevision: 2 });
  insertSession(database, { id: 'recovered', maxRevision: 2 });
  insertSession(database, { id: 'gave-up', failure: 'Repeated crashes' });
  database
    .insert(turn)
    .values([
      {
        id: 'failed',
        sessionId: 'session-1',
        status: 'ended',
        stopReason: 'error',
        startedAt: 1,
      },
      {
        id: 'interrupted-turn',
        sessionId: 'interrupted',
        status: 'ended',
        stopReason: 'error',
        error: {
          code: 'interrupted',
          message: 'The Server stopped during the Turn',
        },
        startedAt: 1,
      },
      {
        id: 'old-failure',
        sessionId: 'recovered',
        status: 'ended',
        stopReason: 'error',
        startedAt: 1,
      },
      {
        id: 'new-success',
        sessionId: 'recovered',
        status: 'ended',
        stopReason: 'end_turn',
        startedAt: 2,
      },
    ])
    .run();
  const { createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  const caller = await createCaller();
  const rows = (await caller.session.list({ archived: false })).sessions;
  expect(
    Object.fromEntries(
      rows.map(
        (
          row,
        ): [
          string,
          'failed' | 'idle' | 'needs_input' | 'running' | 'unread',
        ] => [row.sessionId, row.status],
      ),
    ),
  ).toEqual({
    'session-1': 'failed',
    interrupted: 'unread',
    recovered: 'unread',
    'gave-up': 'failed',
  });
});

it('publishes stored list changes, changes counts only when needed, and aborts a waiting subscription', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({
    maxRevision: 1,
    title: 'Unread',
  });
  onTestFinished(remove);
  const { engine, createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = await createCaller(controller.signal);
  const counts = (await caller.session.counts())[Symbol.asyncIterator]();
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
  await updates.next();
  const writer =
    findDatabaseWriter(engine.system) ??
    expect.unreachable(missingWriterMessage);
  const waitingCounts = counts.next();
  writer.send({
    type: writerWriteEvent,
    job: {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: 'Renamed' },
    },
  });
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { title: 'Renamed' },
  });
  writer.send({
    type: writerWriteEvent,
    job: {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { archivedAt: 5 },
    },
  });
  expect((await waitingCounts).value).toEqual({ attention: 0, running: 0 });
  let archived: SessionListUpdate | undefined;
  do {
    const next = await updates.next();
    if (next.done) throw new Error('List subscription ended');
    archived = next.value;
  } while (archived?.type !== 'changed' || archived.session.archivedAt !== 5);
  expect((await caller.session.list({ archived: false })).sessions).toEqual([]);
  const waiting = counts.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
  await updates.return?.();
});

it('stops a started Engine when the test finishes', (): void => {
  let started: ReturnType<typeof startEngine>['engine'] | undefined;
  onTestFinished((): void => {
    expect(started?.getSnapshot().status).toBe('done');
  });
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  started = startEngine({ database, adapter: createMockAdapter() }).engine;
  expect(started.getSnapshot().status).toBe('active');
});

it('shares one coalesced list read for three subscribers across fifty changes', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const counted = countDatabaseReads(database);
  const { engine, createCaller } = startEngine({
    database: counted.database,
    adapter: createMockAdapter(),
  });
  const controllers = [
    new AbortController(),
    new AbortController(),
    new AbortController(),
    new AbortController(),
  ];
  onTestFinished((): void => {
    for (const controller of controllers) controller.abort();
  });
  const firstCaller = await createCaller(controllers[0]?.signal);
  const secondCaller = await createCaller(controllers[1]?.signal);
  const countsCaller = await createCaller(controllers[2]?.signal);
  const resumedCaller = await createCaller(controllers[3]?.signal);
  vi.useFakeTimers();
  try {
    const first = (await firstCaller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
    const second = (await secondCaller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
    const counts = (await countsCaller.session.counts())[
      Symbol.asyncIterator
    ]();
    expect((await first.next()).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1' },
    });
    expect((await second.next()).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1' },
    });
    expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
    const initialReads = counted.metrics.sessionReads;
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.sessionReads = 0;
    const firstChange = first.next();
    const secondChange = second.next();
    const nextCounts = counts.next();
    const writer =
      findDatabaseWriter(engine.system) ??
      expect.unreachable(missingWriterMessage);
    for (let index = 1; index <= 50; index += 1)
      writer.send({
        type: writerWriteEvent,
        job: {
          type: 'sessionRowUpdate',
          id: 'session-1',
          set: { title: `Change ${index}`, maxRevision: index },
        },
      });
    await vi.advanceTimersByTimeAsync(99);
    expect(counted.metrics.sessionReads).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(counted.metrics.sessionReads).toBe(1);
    expect(initialReads).toBe(1);
    expect((await firstChange).value).toMatchObject({
      type: 'changed',
      session: { title: 'Change 50', status: 'unread' },
    });
    expect((await secondChange).value).toMatchObject({
      type: 'changed',
      session: { title: 'Change 50', status: 'unread' },
    });
    expect((await nextCounts).value).toEqual({ attention: 1, running: 0 });
    expect(await first.return?.()).toMatchObject({ done: true });
    counted.metrics.sessionReads = 0;
    const survivorChange = second.next();
    const survivorCounts = counts.next();
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { title: 'Survives one disconnect', seenRevision: 50 },
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(counted.metrics.sessionReads).toBe(1);
    expect((await survivorChange).value).toMatchObject({
      type: 'changed',
      session: { title: 'Survives one disconnect' },
    });
    expect((await survivorCounts).value).toEqual({ attention: 0, running: 0 });
    controllers[1]?.abort();
    controllers[2]?.abort();
    counted.metrics.sessionReads = 0;
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { title: 'No subscribers' },
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(counted.metrics.sessionReads).toBe(0);
    expect(await second.next()).toMatchObject({ done: true });
    expect(await counts.next()).toMatchObject({ done: true });
    const resumed = (await resumedCaller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
    expect((await resumed.next()).value).toMatchObject({
      type: 'changed',
      session: { title: 'No subscribers' },
    });
    expect(counted.metrics.sessionReads).toBe(1);
    controllers[3]?.abort();
    expect(await resumed.next()).toMatchObject({ done: true });
  } finally {
    vi.useRealTimers();
  }
});

it('reads only the changed Session and pages the shared cache', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  for (let index = 2; index <= 60; index++)
    insertSession(database, { id: `session-${index}` });
  const counted = countDatabaseReads(database);
  const { engine, createCaller } = startEngine({
    database: counted.database,
    adapter: createMockAdapter(),
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = await createCaller(controller.signal);
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  for (let index = 0; index < 60; index++)
    expect((await updates.next()).value).toMatchObject({ type: 'changed' });
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.queries = 0;
    counted.metrics.rows = 0;
    const changed = updates.next();
    const writer: ActorRefFrom<typeof writerMachine> =
      engine.system.get('databaseWriter');
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { title: changedAloneTitle, maxRevision: 1 },
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await changed).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1', title: changedAloneTitle },
    });
    expect(counted.metrics.queries).toBeLessThanOrEqual(5);
    expect(counted.metrics.rows).toBeLessThanOrEqual(3);
    counted.metrics.queries = 0;
    const page = await caller.session.list({ archived: false });
    expect(page.sessions[0]).toMatchObject({
      sessionId: 'session-1',
      title: changedAloneTitle,
      status: 'unread',
    });
    expect(page.sessions).toHaveLength(50);
    expect(page.nextCursor).not.toBeNull();
    const next = await caller.session.list({
      archived: false,
      cursor: page.nextCursor ?? undefined,
    });
    expect(next.sessions).toHaveLength(10);
    expect(next.nextCursor).toBeNull();
    expect(counted.metrics.queries).toBe(0);
    controller.abort();
    await updates.return?.();
  } finally {
    vi.useRealTimers();
  }
});

it('initializes a fresh list after all watchers leave and unwatched data changes', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const { engine, createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const watchedCaller = await createCaller(controller.signal);
  const caller = await createCaller();
  const updates = (await watchedCaller.session.listUpdates())[
    Symbol.asyncIterator
  ]();
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { title: '' },
  });
  controller.abort();
  await updates.return?.();
  const writer: ActorRefFrom<typeof writerMachine> =
    engine.system.get('databaseWriter');
  writer.send({
    type: writerWriteEvent,
    job: {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: 'Changed without watchers', maxRevision: 1 },
    },
  });
  await waitFor(
    writer,
    (snapshot): boolean => snapshot.context.queue.length === 0,
  );
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toMatchObject([
    {
      sessionId: 'session-1',
      title: 'Changed without watchers',
      status: 'unread',
    },
  ]);
});

it('pages current queued activity before the list publication delay', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'session-2', activityAt: 10 });
  const counted = countDatabaseReads(database);
  const batch = Promise.withResolvers<void>();
  onTestFinished((): void => batch.resolve());
  const { engine, createCaller } = startEngine({
    database: counted.database,
    adapter: createMockAdapter(),
    databaseWriter: writerMachine.provide({
      actors: {
        writeBatch: fromPromise<
          ReturnType<typeof writeJobs>,
          { database: Parameters<typeof writeJobs>[0]; jobs: WriterJob[] }
        >(async ({ input }) => {
          await batch.promise;
          return writeJobs(input.database, input.jobs);
        }),
      },
    }),
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = await createCaller(controller.signal);
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  await updates.next();
  await updates.next();
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    const writer: ActorRefFrom<typeof writerMachine> =
      engine.system.get('databaseWriter');
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { title: 'Queued newest', maxRevision: 1 },
        activityAt: 20,
      },
    });
    expect(
      (await caller.session.list({ archived: false })).sessions.map(
        (row): (string | number)[] => [row.sessionId, row.activityAt],
      ),
    ).toEqual([
      ['session-1', 20],
      ['session-2', 10],
    ]);
    expect(writer.getSnapshot().context.queue).toHaveLength(1);
    counted.metrics.sessionReads = 0;
    batch.resolve();
    await vi.advanceTimersByTimeAsync(100);
    expect(writer.getSnapshot().context.queue).toHaveLength(0);
    expect(counted.metrics.sessionReads).toBe(1);
    expect(
      (await caller.session.list({ archived: false })).sessions[0],
    ).toMatchObject({ sessionId: 'session-1', activityAt: 20 });
    controller.abort();
    await updates.return?.();
  } finally {
    vi.useRealTimers();
  }
});

it('updates a cached parent when its stored Subagent Turn changes', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  const { engine, createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = await createCaller(controller.signal);
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await updates.next()).value).toMatchObject({
    session: { subagents: { total: 1, running: 0 } },
  });
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    const writer: ActorRefFrom<typeof writerMachine> =
      engine.system.get('databaseWriter');
    const running = updates.next();
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'turnInsert',
        turn: {
          id: 'child-turn',
          sessionId: 'child-1',
          status: 'running',
          startedAt: 1,
        },
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await running).value).toMatchObject({
      session: { sessionId: 'session-1', subagents: { total: 1, running: 1 } },
    });
    const stopped = updates.next();
    writer.send({
      type: writerWriteEvent,
      job: {
        type: 'turnUpdate',
        id: 'child-turn',
        set: { status: 'ended', endedAt: 2 },
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await stopped).value).toMatchObject({
      session: { sessionId: 'session-1', subagents: { total: 1, running: 0 } },
    });
    controller.abort();
    await updates.return?.();
  } finally {
    vi.useRealTimers();
  }
});

it.each(
  agentAdapters.flatMap(({ agent }): StoredColumnCases => [
    {
      agent,
      table: session,
      column: session.configValues,
      id: 'session-1',
      field: 'Session config values',
    },
    {
      agent,
      table: session,
      column: session.vendorRef,
      id: 'session-1',
      field: 'Session vendor reference',
    },
    {
      agent,
      table: turn,
      column: turn.usage,
      id: 'bad-turn',
      field: 'Turn usage',
    },
    {
      agent,
      table: turn,
      column: turn.error,
      id: 'bad-turn',
      field: 'Turn error',
    },
  ]),
)(
  'drops only the Session with unreadable $field JSON for $agent',
  async ({ agent, table, column, id }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const { createCaller } = startEngine({
      database,
      adapter: createMockAdapter({}, agent),
    });
    const caller = await createCaller();
    insertSession(database, { id: 'healthy', agent });
    database
      .insert(turn)
      .values({ id: 'bad-turn', sessionId: 'session-1', status: 'ended' })
      .run();
    database.run(
      sql`update ${table} set ${sql.identifier(column.name)} = 'broken-json' where ${table.id} = ${id}`,
    );
    const result = await caller.session.list({ archived: false });
    expect(result.sessions.map((row): string => row.sessionId)).toEqual([
      'healthy',
    ]);
    expect(reported).toHaveBeenCalledWith(
      rejectedSessionListLog,
      expect.anything(),
    );
  },
);

it.each(
  agentAdapters.flatMap(({ agent }): FeedColumnCase[] =>
    (['agent_message', 'agent_thought', 'tool_call_update'] as const).flatMap(
      (kind): FeedColumnCase[] => [
        { agent, kind, column: feedRow.payload, field: 'payload' },
        { agent, kind, column: feedRow.sourceRef, field: 'source reference' },
      ],
    ),
  ),
)(
  'degrades only the Session with unreadable $kind $field JSON for $agent',
  async ({ agent, kind, column }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const { createCaller } = startEngine({
      database,
      adapter: createMockAdapter({}, agent),
    });
    const caller = await createCaller();
    insertSession(database, { id: 'healthy', agent });
    database
      .insert(turn)
      .values({ id: 'running', sessionId: 'session-1', status: 'running' })
      .run();
    database
      .insert(feedRow)
      .values({
        sessionId: 'session-1',
        id: 'bad',
        position: 0,
        revision: 1,
        turnId: 'running',
        state: 'settled',
        sessionUpdate: kind,
        payloadVersion: 1,
        payload: {
          messageId: 'bad',
          content: [{ type: 'text', text: 'A stored reply' }],
          toolCallId: 'bad',
          title: 'Read a file',
          status: 'in_progress',
          kind: 'read',
        },
      })
      .run();
    database.run(
      sql`update ${feedRow} set ${sql.identifier(column.name)} = 'broken-json' where ${feedRow.id} = 'bad'`,
    );
    const result = await caller.session.list({ archived: false });
    expect(result.sessions).toHaveLength(2);
    expect(
      result.sessions.find((row): boolean => row.sessionId === 'session-1'),
    ).toMatchObject({ activity: '', plan: null });
    expect(result.sessions.map((row): string => row.sessionId)).toContain(
      'healthy',
    );
    expect(
      reported.mock.calls.some(([message]): boolean =>
        String(message).includes('rejected'),
      ),
    ).toBe(true);
    await expect(
      caller.feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 50,
      }),
    ).rejects.toThrow();
  },
);

for (const adapter of agentAdapters)
  it(`keeps other ${adapter.agent} Sessions usable after a Feed actor fails`, async (): Promise<void> => {
    const failure = new Error('Feed failed on its first change');
    const sessions = registryMachine.provide({
      actors: {
        session: sessionMachine.provide({
          actors: {
            feed: feedMachine.provide({
              actions: {
                sendToWriter: (
                  { context, system },
                  { job, committed },
                ): void => {
                  if (context.sessionId === brokenSessionId) throw failure;
                  system
                    .get('databaseWriter')
                    .send({ type: writerWriteEvent, job, committed });
                },
              },
            }),
          },
        }),
      },
    });
    const root = await startNewSessionEngine(adapter, { sessions });
    insertSession(root.database, {
      id: brokenSessionId,
      agent: adapter.agent,
      checkoutPath: root.project,
    });
    insertSession(root.database, {
      id: 'session-2',
      agent: adapter.agent,
      checkoutPath: root.project,
    });
    const controller = new AbortController();
    onTestFinished((): void => controller.abort());
    const caller = await root.createCaller(controller.signal);
    const list = (await caller.session.listUpdates())[Symbol.asyncIterator]();
    await list.next();
    const registry: ActorRefFrom<typeof registryMachine> | undefined =
      root.engine.system.get('sessions');
    if (!registry) throw new Error('No Session registry');
    registry.send({
      type: 'sessions.open',
      sessionId: brokenSessionId,
      agent: adapter.agent,
    });
    await expect
      .poll((): ReturnType<typeof Reflect.get> =>
        root.engine.system.get('session:session-broken')?.getSnapshot().can({
          type: 'session.prompt',
          turnId: 'readiness-check',
          content: [],
        }),
      )
      .toBe(true);
    const feed = (
      await caller.feed.subscribe({ sessionId: brokenSessionId, after: null })
    )[Symbol.asyncIterator]();
    expect((await feed.next()).value).toMatchObject({ type: 'snapshot' });
    const rejectedFeed = (async (): Promise<void> => {
      for await (const event of {
        [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput, void> =>
          feed,
      })
        expect(event).toMatchObject({ type: 'snapshot' });
    })().then(
      (): undefined => undefined,
      (error: unknown): unknown => error,
    );
    const engineErrors: unknown[] = [];
    root.engine.subscribe({
      error: (error): number => engineErrors.push(error),
    });
    await expect(
      caller.session.prompt({
        sessionId: brokenSessionId,
        prompt: [{ type: 'text', text: 'First Session' }],
      }),
    ).rejects.toThrow('could not be saved');
    expect(await rejectedFeed).toMatchObject({ message: failure.message });
    await expect
      .poll((): ReturnType<typeof root.engine.system.get> =>
        root.engine.system.get('session:session-broken'),
      )
      .toBeUndefined();
    await caller.session.prompt({
      sessionId: 'session-2',
      prompt: [{ type: 'text', text: 'Finish this Turn' }],
    });
    await expect
      .poll(async (): Promise<SessionSnapshot['state']> => {
        const snapshot = await readSessionSnapshot(
          root.createCaller,
          'session-2',
        );
        return snapshot.state;
      })
      .toBe('idle');
    await expect
      .poll(async (): Promise<boolean> =>
        (
          await caller.feed.page({ sessionId: 'session-2', direction: 'tail' })
        ).rows.some(
          (
            row,
          ): row is Extract<
            SessionUpdate,
            { sessionUpdate: 'agent_message' }
          > => row.sessionUpdate === 'agent_message',
        ),
      )
      .toBe(true);
    expect(root.engine.getSnapshot().status).toBe('active');
    expect(engineErrors).toEqual([]);
    controller.abort();
    await list.return?.();
  });

async function startNewSessionEngine(
  identity: AgentAdapter,
  { sessions }: { sessions?: typeof registryMachine } = {},
): Promise<
  ReturnType<typeof startEngine> & {
    project: string;
    database: ReturnType<typeof openTestDatabase>['database'];
  }
> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'argo-fixture-')));
  onTestFinished((): void => rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  const home = path.join(root, 'home');
  mkdirSync(project);
  mkdirSync(home);
  initTestRepository(project);
  const { database, remove } = openTestDatabase({}, project);
  onTestFinished(remove);
  return {
    project,
    database,
    ...startEngine({
      database,
      adapter: createAppFixtureAdapter(identity),
      acpComposition: {
        acp: { launchProcess: createAppFixtureProcessLauncher({}) },
        resolveAgentLaunch: async (input) => ({
          agentId: input.agent,
          projectId: input.projectId,
          executable: '/mock-agent',
          version: '1',
          args: [],
          cwd: input.projectPath,
          env: {},
          authContext: 'shared-fixture',
        }),
      },
      home,
      sessions,
    }),
  };
}

it.each(agentAdapters)(
  'creates a $agent Session and persists its initial prompt and completed Turn with shared fixtures',
  async (identity): Promise<void> => {
    const root = await startNewSessionEngine(identity);
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: identity.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Initial prompt' }],
    });
    await expect
      .poll(async (): Promise<string | undefined> => {
        const { rows } = await caller.feed.page({
          sessionId,
          direction: 'tail',
        });
        return rows.at(-1)?.sessionUpdate;
      })
      .toBe('agent_message');
    const { rows } = await caller.feed.page({ sessionId, direction: 'tail' });
    expect(rows).toEqual([
      expect.objectContaining({
        sessionUpdate: 'user_message',
        content: [{ type: 'text', text: 'Initial prompt' }],
      }),
      expect.objectContaining({
        sessionUpdate: 'agent_message',
        state: 'settled',
        content: [
          { type: 'text', text: 'The shared fixture completed this Turn.' },
        ],
      }),
    ]);
    expect(rows[0]?.turnId).toEqual(rows[1]?.turnId);
    expect(
      root.database
        .select()
        .from(turn)
        .where(eq(turn.sessionId, sessionId))
        .all(),
    ).toEqual([
      expect.objectContaining({
        id: rows[0]?.turnId,
        status: 'ended',
        stopReason: 'end_turn',
      }),
    ]);
  },
);

async function readSessionSnapshot(
  createCaller: Awaited<
    ReturnType<typeof startNewSessionEngine>
  >['createCaller'],
  sessionId: string,
): Promise<SessionSnapshot> {
  const controller = new AbortController();
  const caller = await createCaller(controller.signal);
  const updates = (await caller.feed.subscribe({ sessionId, after: null }))[
    Symbol.asyncIterator
  ]();
  try {
    for await (const update of {
      [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput, void> =>
        updates,
    })
      if (update.type === 'snapshot') return update.snapshot;
    throw new Error('No Session snapshot');
  } finally {
    controller.abort();
    await updates.return?.();
  }
}

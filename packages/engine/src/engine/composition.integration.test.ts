import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type AgentAdapter, agentAdapters } from '@repo/agents';
import type { SessionInfo } from '@repo/contracts';
import type { SessionListUpdate, SessionUpdate } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { feedRow, session, turn } from '@repo/db/schema';
import { listBranches } from '@repo/git';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { createAppFixtureProcessLauncher } from '@repo/mocks/agent/acp-fixtures';
import { createAppFixtureAdapter } from '@repo/mocks/agent/app-fixtures';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import type { ActorRefFrom } from 'xstate';
import { waitFor } from 'xstate';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { initTestRepository } from '#mocks/git';
import { liveHeaderMocks } from '#mocks/live-header';
import { writerMachine, findDatabaseWriter } from '../services/feed';

const missingWriterMessage = 'Writer actor is missing';
const engineStopEvent = 'engine.stop';
const agentFeedEvent = 'agent.feed';
const checkingTestsStatus = 'Checking the tests';
const retryingStatus = 'Retrying (2 of 5)';
const rejectedSessionListLog = 'sessions: rejected list shape #1';
const writerWriteEvent = 'writer.write';
const changedAloneTitle = 'Changed alone';
const unwatchedTitle = 'Changed without watchers';

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

type MalformedFeedCase = {
  agent: AgentAdapter['agent'];
  kind: Extract<
    SessionUpdate['sessionUpdate'],
    'agent_message' | 'agent_thought' | 'plan_update'
  >;
};

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
    const { createCaller } = await startEngineTestHost({
      database,
      adapters: [adapter],
    });
    const controller = new AbortController();
    onTestFinished((): void => controller.abort());
    const caller = createCaller({ signal: controller.signal });
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
  const { createCaller } = await startEngineTestHost({
    database,
    adapters: [adapter],
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
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
  // A reconnect catches up only to the Session's stored revision.
  database.$client
    .prepare('UPDATE session SET max_revision = 500 WHERE id = ?')
    .run('session-1');
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
    const { createCaller } = await startEngineTestHost({
      database,
      adapters: [createMockAdapter({}, agent)],
    });
    const caller = createCaller();
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
    const { createCaller } = await startEngineTestHost({
      database,
      adapters: [createMockAdapter({}, agent)],
    });
    const caller = createCaller();
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
    const { createCaller } = await startEngineTestHost({
      database,
      adapters: [createMockAdapter({}, agent)],
    });
    const caller = createCaller();
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
  const {
    engine,
    createCaller,
    database: engineDatabase,
  } = await startEngineTestHost({ database, adapters: [adapter] });
  const caller = createCaller();
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
  expect(engineDatabase.$client.isOpen).toBe(false);
  expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(database.select({ id: feedRow.id }).from(feedRow).all()).toEqual([
    { id: messageId },
    { id: 'reply' },
  ]);
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
  const { createCaller } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const caller = createCaller();
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
  const { engine, createCaller } = await startEngineTestHost({
    database,
    adapters: [adapter],
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
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
  const { engine, createCaller } = await startEngineTestHost({
    adapters: [createMockAdapter()],
    home: directory,
  });
  const caller = createCaller();
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
  const { createCaller } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const caller = createCaller();
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
  const { engine, createCaller } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
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

it('shares one coalesced list read for three subscribers across fifty changes', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const {
    engine,
    createCaller,
    database: engineDatabase,
  } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const counted = countDatabaseReads(engineDatabase);
  const controllers = [
    new AbortController(),
    new AbortController(),
    new AbortController(),
    new AbortController(),
  ];
  onTestFinished((): void => {
    for (const controller of controllers) controller.abort();
  });
  const firstCaller = createCaller({ signal: controllers[0]?.signal });
  const secondCaller = createCaller({ signal: controllers[1]?.signal });
  const countsCaller = createCaller({ signal: controllers[2]?.signal });
  const resumedCaller = createCaller({ signal: controllers[3]?.signal });
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
  const {
    engine,
    createCaller,
    database: engineDatabase,
  } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const counted = countDatabaseReads(engineDatabase);
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
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
  const { engine, createCaller } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const watchedCaller = createCaller({ signal: controller.signal });
  const caller = createCaller();
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
      set: { title: unwatchedTitle, maxRevision: 1 },
    },
  });
  await expect
    .poll(
      () =>
        database.select().from(session).where(eq(session.id, 'session-1')).get()
          ?.title,
    )
    .toBe(unwatchedTitle);
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toMatchObject([
    {
      sessionId: 'session-1',
      title: unwatchedTitle,
      status: 'unread',
    },
  ]);
});

it('pages current queued activity before the list publication delay', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'session-2', activityAt: 10 });
  const {
    engine,
    createCaller,
    database: engineDatabase,
  } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  engineDatabase.$client.exec(
    "CREATE TEMP TRIGGER pause_activity BEFORE UPDATE ON session BEGIN SELECT RAISE(FAIL, 'test write failure'); END",
  );
  const counted = countDatabaseReads(engineDatabase);
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  await updates.next();
  await updates.next();
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.sessionReads = 0;
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
    expect(
      database.select().from(session).where(eq(session.id, 'session-1')).get()
        ?.activityAt,
    ).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(counted.metrics.sessionReads).toBe(1);
    counted.metrics.sessionReads = 0;
    engineDatabase.$client.exec('DROP TRIGGER pause_activity');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      database.select().from(session).where(eq(session.id, 'session-1')).get()
        ?.activityAt,
    ).toBe(20);
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
  const { engine, createCaller } = await startEngineTestHost({
    database,
    adapters: [createMockAdapter()],
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = createCaller({ signal: controller.signal });
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
    const { createCaller } = await startEngineTestHost({
      database,
      adapters: [createMockAdapter({}, agent)],
    });
    const caller = createCaller();
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
    const { createCaller } = await startEngineTestHost({
      database,
      adapters: [createMockAdapter({}, agent)],
    });
    const caller = createCaller();
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

async function startNewSessionEngine(identity: AgentAdapter): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    project: string;
    database: ReturnType<typeof openTestDatabase>['database'];
  }
> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'argo-fixture-')));
  onTestFinished((): void => rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  mkdirSync(project);
  initTestRepository(project);
  const { database, remove } = openTestDatabase({}, project);
  onTestFinished(remove);
  return {
    project,
    ...(await startEngineTestHost({
      database,
      adapters: [createAppFixtureAdapter(identity)],
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
    })),
  };
}

function rejectUpstreamCall(): never {
  throw new Error('App fixture contacted upstream');
}

it.each(agentAdapters)(
  'creates a $agent Session and persists its initial prompt and completed Turn with shared fixtures without contacting upstream',
  async (identity): Promise<void> => {
    const root = await startNewSessionEngine({
      ...identity,
      probe: rejectUpstreamCall,
      connect: rejectUpstreamCall,
    });
    const caller = root.createCaller();
    expect(await caller.agents.list()).toMatchObject([
      {
        agent: identity.agent,
        label: identity.label,
        logo: identity.logo,
        availability: 'available',
      },
    ]);
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

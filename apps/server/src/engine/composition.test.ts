import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { type AgentAdapter, agentAdapters } from '@repo/agents';
import { appRouter, type Services } from '@repo/api';
import type {
  SessionListUpdate,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { feedRow, turn } from '@repo/db/schema';
import { listBranches } from '@repo/git';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { mockClis } from '@repo/mocks/cli';
import {
  type MockCliScenarioInput,
  mockCliScenarioEnvironment,
} from '@repo/mocks/cli/mock-cli';
import { readRequestAnswers } from '@repo/mocks/cli/request-answer';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import type { ActorRefFrom } from 'xstate';
import { createActor, fromCallback, fromPromise, waitFor } from 'xstate';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { initTestRepository } from '#mocks/git';
import { liveHeaderMocks } from '#mocks/live-header';
import { feedMachine } from '../services/feed/feed-machine';
import type { writerMachine } from '../services/feed/writer-machine';
import { createServerServices } from '../services/server-services';
import { registryMachine } from '../services/sessions/registry-machine';
import type { SessionActorRef } from '../services/sessions/session-machine';
import { sessionMachine } from '../services/sessions/session-machine';
import type { HttpServerOptions } from './http-server';
import { engineMachine } from './machine';

// The longest the teardown waits for the Engine's graceful stop.
const gracefulStopLimit = 5_000;

// A crash Notice can land after the Session first reports idle.
const cancellationSettleWait = 200;

// An Engine on a mock Agent; without `database` it opens and closes its real database in `home`. It stops itself when the test ends.
function startEngine({
  database,
  adapter,
  home = '/unused',
  closeDatabase = () => {},
  sessions = registryMachine,
}: {
  database?: ReturnType<typeof openTestDatabase>['database'];
  adapter: AgentAdapter;
  home?: string;
  closeDatabase?: () => void;
  sessions?: typeof registryMachine;
}) {
  let services: Services | undefined;
  const machine = engineMachine.provide({
    actors: {
      ...(database && { openDatabase: fromPromise(async () => database) }),
      processSignals: fromCallback(() => {}),
      sessions,
      startHttpServer: fromPromise(
        async ({ input }: { input: HttpServerOptions }) => {
          services = createServerServices({
            ...input,
            blobsFolder: path.join(input.home, 'blobs'),
          });
          return { close: async () => {} };
        },
      ),
    },
    actions: {
      log: () => {},
      sendToSupervisor: () => {},
      ...(database && { closeDatabase }),
    },
  });
  const engine = createActor(machine, {
    input: {
      home,
      port: 7337,
      version: '1',
      startedAt: new Date().toISOString(),
      adapters: [adapter],
    },
  }).start();
  onTestFinished(async () => {
    // Fake timers would leave the wait hanging.
    vi.useRealTimers();
    try {
      if (engine.getSnapshot().status !== 'done') {
        engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
        await waitFor(engine, (snapshot) => snapshot.status === 'done', {
          timeout: gracefulStopLimit,
        }).catch(() => {
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
    createCaller: async (signal?: AbortSignal) => {
      await waitFor(engine, (snapshot) =>
        snapshot.matches({ live: 'running' }),
      );
      if (!services) throw new Error('No services');
      return appRouter.createCaller({ services }, { signal });
    },
  };
}

it.each(liveHeaderMocks)(
  'shares live header and list activity for $agent after Feed writes',
  async ({ command, thought, retry, progress }) => {
    const { database, remove } = openTestDatabase();
    onTestFinished(remove);
    let stream: MockAgentStream | undefined;
    const adapter = createMockAdapter({
      stream: (current) => {
        stream = current;
      },
    });
    const { createCaller } = startEngine({ database, adapter });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());
    const caller = await createCaller(controller.signal);
    await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Check tests' }],
    });
    const subscription = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    const expectActivity = async (expected: string) => {
      await expect
        .poll(
          async () =>
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
    const sendRow = (row: SessionUpdate) => {
      const {
        sessionId: _sessionId,
        turnId: _turnId,
        position: _position,
        revision: _revision,
        ...update
      } = row;
      stream?.send({
        type: 'agent.feed',
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
    await expectActivity('Checking the tests');
    sendRow(retry);
    await expectActivity('Retrying (2 of 5)');
    // Settled rows have left the Feed actor by now; a fresh subscription must retain the retry.
    const reconnect = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    expect((await reconnect.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        liveHeader: {
          text: 'Retrying (2 of 5)',
          source: { type: 'retry' },
          startedAt: expect.any(Number),
        },
      },
    });
    for (const row of progress) {
      sendRow(retry);
      await expectActivity('Retrying (2 of 5)');
      sendRow(row);
      await expect
        .poll(async () =>
          (
            await caller.feed.page({
              sessionId: 'session-1',
              direction: 'tail',
            })
          ).rows.some((stored) => stored.id === row.id),
        )
        .toBe(true);
      await expectActivity('Checking the tests');
    }
    sendRow({ ...command, status: 'completed', state: 'settled' });
    await expectActivity('Checking the tests');
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

it('rejects malformed stored activity through the Feed subscription', async () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (current) => {
      stream = current;
    },
  });
  const { createCaller } = startEngine({ database, adapter });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
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
  const rejected = expect(subscription.next()).rejects.toThrow(
    'Unrecognised live-header Feed data',
  );
  stream?.send({ type: 'agent.usage', usage: { used: 10, size: 100 } });
  await rejected;
});

it('serves live Session procedures and drains their Feed before closing the database', async () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  let closedDatabase = false;
  const adapter = createMockAdapter({
    stream: (stream) => {
      stream.receive((command) => {
        if (command.type === 'agent.prompt')
          stream.send({
            type: 'agent.feed',
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
    closeDatabase: () => {
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
  engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await waitFor(engine, (snapshot) => snapshot.status === 'done');
  expect(closedDatabase).toBe(true);
  expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(
    await caller.feed.page({ sessionId: 'session-1', direction: 'tail' }),
  ).toMatchObject({ rows: [{ id: messageId }, { id: 'reply' }] });
});

it.each(agentAdapters)(
  'serves a recorded $agent Turn through tRPC and stores it under one Argo Turn id',
  async (adapter) => {
    const directory = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'argo-composition-')),
    );
    onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const mockCli = mockClis[adapter.agent];
    if (!mockCli) throw new Error(`No mock CLI for ${adapter.agent}`);
    await mockCli.write(directory, { recording: mockCli.recordings.turn });
    vi.stubEnv(
      'PATH',
      `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
    );
    const transcript = mockCli.writeTranscript(
      directory,
      directory,
      crypto.randomUUID(),
    );
    for (const [key, value] of Object.entries({
      ...transcript.environment,
      ...mockCliScenarioEnvironment(transcript.scenario),
    }))
      vi.stubEnv(key, value);
    const { database, remove } = openTestDatabase(
      { agent: adapter.agent, checkoutPath: directory },
      directory,
    );
    onTestFinished(remove);
    const { engine, createCaller } = startEngine({
      database,
      adapter,
      home: directory,
    });
    const caller = await createCaller();
    const { messageId } = await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Edit the files and run a command.' }],
    });
    await expect
      .poll(
        async () => {
          const { rows } = await caller.feed.page({
            sessionId: 'session-1',
            direction: 'tail',
          });
          return (
            rows.at(-1)?.sessionUpdate === 'agent_message' &&
            rows.at(-1)?.state === 'settled'
          );
        },
        { timeout: 10000 },
      )
      .toBe(true);
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    await waitFor(engine, (snapshot) => snapshot.status === 'done');
    const { rows } = await caller.feed.page({
      sessionId: 'session-1',
      direction: 'tail',
    });
    expect(rows[0]).toMatchObject({
      id: messageId,
      sessionUpdate: 'user_message',
      content: [{ type: 'text', text: 'Edit the files and run a command.' }],
    });
    expect(
      rows.filter((row) => row.sessionUpdate === 'user_message'),
    ).toHaveLength(1);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionUpdate: 'tool_call_update',
          kind: 'edit',
          state: 'settled',
          status: 'completed',
        }),
        expect.objectContaining({
          sessionUpdate: 'tool_call_update',
          kind: 'execute',
          state: 'settled',
          status: 'completed',
        }),
      ]),
    );
    expect(new Set(rows.map((row) => row.turnId)).size).toBe(1);
    expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  },
);

it('lists only top-level Sessions, searches literal titles, filters archives and pages tied activity', async () => {
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
  expect(second.sessions.map((row) => row.sessionId)).toEqual(['page-00']);
  expect(second.nextCursor).toBeNull();
  expect(
    (await caller.session.list({ archived: true })).sessions.map(
      (row) => row.sessionId,
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

it('sends live list changes and attention/running counts through request and Turn transitions', async () => {
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
    stream: (current) => {
      stream = current;
    },
  });
  const { engine, createCaller } = startEngine({ database, adapter });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const caller = await createCaller(controller.signal);
  const counts = (await caller.session.counts())[Symbol.asyncIterator]();
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { sessionId: 'session-1', status: 'idle' },
  });
  const writer = engine.system.get('databaseWriter') as ActorRefFrom<
    typeof writerMachine
  >;
  for (const sessionId of ['archived', 'subagent'])
    writer.send({
      type: 'writer.write',
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
    type: 'agent.feed',
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
      async () => (await caller.session.list({ archived: false })).sessions[0],
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

it('seeds the Project from ARGO_PROJECT_PATH at Engine startup', async () => {
  const directory = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'argo-seed-')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
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
  engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await waitFor(engine, (snapshot) => snapshot.status === 'done');
});

it('uses the newest Turn for failures and excludes interrupted Turns from Failed', async () => {
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
    Object.fromEntries(rows.map((row) => [row.sessionId, row.status])),
  ).toEqual({
    'session-1': 'failed',
    interrupted: 'unread',
    recovered: 'unread',
    'gave-up': 'failed',
  });
});

it('publishes stored list changes, changes counts only when needed, and aborts a waiting subscription', async () => {
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
  onTestFinished(() => controller.abort());
  const caller = await createCaller(controller.signal);
  const counts = (await caller.session.counts())[Symbol.asyncIterator]();
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
  await updates.next();
  const writer = engine.system.get('databaseWriter') as ActorRefFrom<
    typeof writerMachine
  >;
  const waitingCounts = counts.next();
  writer.send({
    type: 'writer.write',
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
    type: 'writer.write',
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

// Sets the whole scenario once, before the CLI starts.
const stubScenario = (scenario: MockCliScenarioInput) => {
  for (const [key, value] of Object.entries(
    mockCliScenarioEnvironment(scenario),
  ))
    vi.stubEnv(key, value);
};

// An Engine on a Project whose `feature` branch is one commit ahead of `main`, with the Agent's mock CLI on PATH; its teardown stops it and deletes everything when the test ends.
async function startNewSessionEngine(
  adapter: AgentAdapter,
  {
    recording,
    availability,
    sessions,
    searchPath = (bin) => `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
  }: {
    sessions?: typeof registryMachine;
    recording?: string;
    availability?: 'available' | 'not_installed' | 'not_signed_in';
    searchPath?: (bin: string) => string;
  } = {},
) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'argo-new-')));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  const bin = path.join(root, 'bin');
  const home = path.join(root, 'home');
  for (const directory of [project, bin, home]) mkdirSync(directory);
  const git = initTestRepository(project);
  const mockCli = mockClis[adapter.agent];
  if (!mockCli) throw new Error(`No mock CLI for ${adapter.agent}`);
  await mockCli.write(bin, {
    recording: recording ?? mockCli.recordings.turn,
    availability,
  });
  vi.stubEnv('PATH', searchPath(bin));
  const { database, remove } = openTestDatabase({}, project);
  onTestFinished(remove);
  const { engine, createCaller } = startEngine({
    database,
    adapter,
    home,
    sessions,
  });
  return {
    project,
    home,
    git,
    database,
    engine,
    createCaller,
  };
}

async function readSnapshot(
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
    for await (const update of { [Symbol.asyncIterator]: () => updates })
      if (update.type === 'snapshot') return update.snapshot;
    throw new Error('No Session snapshot');
  } finally {
    controller.abort();
    await updates.return?.();
  }
}

const responseOrders = [
  {
    requestBeforeStartResponse: false,
    title: 'prompt response delayed: false',
  },
  {
    requestBeforeStartResponse: true,
    title:
      'prompt response delayed: true; skipped where the protocol has no prompt response to reorder',
  },
];
for (const adapter of agentAdapters)
  for (const { requestBeforeStartResponse, title } of responseOrders)
    it.skipIf(
      requestBeforeStartResponse &&
        mockClis[adapter.agent]?.unsupportedScenarios.includes(
          'requestBeforeStartResponse',
        ),
    )(
      `answers a ${adapter.agent} Permission request once through tRPC (${title})`,
      async () => {
        stubScenario({ requestBeforeStartResponse });
        const root = await startNewSessionEngine(adapter, {
          recording: 'permission',
        });
        const caller = await root.createCaller();
        const { sessionId } = await caller.session.new({
          projectId: 'project-1',
          agent: adapter.agent,
          checkout: { type: 'main' },
          configOptions: [],
          prompt: [{ type: 'text', text: 'Run the command' }],
        });
        await expect
          .poll(
            async () =>
              (await readSnapshot(root.createCaller, sessionId))
                .pendingPermission,
          )
          .not.toBeNull();
        const request = (await readSnapshot(root.createCaller, sessionId))
          .pendingPermission;
        if (!request) throw new Error('No Permission request');
        expect(request.options).toEqual(permissionOptions);
        const answer = {
          sessionId,
          toolCallId: request.toolCallId,
          optionId: 'allow_once' as const,
        };
        expect(await caller.session.answerPermission(answer)).toEqual({});
        await expect(
          caller.session.answerPermission(answer),
        ).rejects.toMatchObject({
          code: 'CONFLICT',
          message: 'already answered',
        });
        await expect
          .poll(
            async () =>
              (await readSnapshot(root.createCaller, sessionId)).state,
          )
          .toBe('idle');
        expect(
          await caller.feed.row({ sessionId, id: request.toolCallId }),
        ).toMatchObject({
          _meta: {
            argo: {
              permissionOutcome: {
                outcome: 'selected',
                optionId: 'allow_once',
              },
            },
          },
        });
      },
    );

it.each(
  agentAdapters.flatMap((adapter) =>
    (
      [{ type: 'worktree', baseBranch: 'feature' }, { type: 'main' }] as const
    ).map((checkout) => ({ adapter, agent: adapter.agent, checkout })),
  ),
)(
  'starts a $agent Session in the $checkout.type checkout and runs its first Turn in one call',
  async ({ adapter, checkout }) => {
    const root = await startNewSessionEngine(adapter);
    const { database, engine, createCaller } = root;
    const caller = await createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout,
      configOptions: [],
      prompt: [
        {
          type: 'text',
          text: 'Edit the files and run a command.\nKeep it short.',
        },
      ],
    });
    const listed = (await caller.session.list({ archived: false })).sessions;
    const created = listed.find((row) => row.sessionId === sessionId);
    expect(created).toMatchObject({
      agent: adapter.agent,
      title: 'Edit the files and run a command.',
      titleSource: 'prompt',
      checkout:
        checkout.type === 'main'
          ? { type: 'main', path: root.project, branch: 'main' }
          : {
              type: 'worktree',
              path: path.join(root.home, 'worktrees', 'project-1', sessionId),
              branch: `argo/${sessionId}`,
            },
    });
    expect(
      execFileSync('git', ['log', '-1', '--format=%s'], {
        cwd: created?.checkout.path,
        encoding: 'utf8',
      }).trim(),
    ).toBe(checkout.type === 'main' ? 'Initial' : 'Feature');
    expect(await caller.projects.list()).toEqual([
      expect.objectContaining({ checkoutChoice: checkout }),
    ]);
    await expect
      .poll(
        async () => {
          const { rows } = await caller.feed.page({
            sessionId,
            direction: 'tail',
          });
          return (
            rows.at(-1)?.sessionUpdate === 'agent_message' &&
            rows.at(-1)?.state === 'settled'
          );
        },
        { timeout: 10000 },
      )
      .toBe(true);
    const { rows } = await caller.feed.page({ sessionId, direction: 'tail' });
    expect(rows[0]).toMatchObject({
      sessionUpdate: 'user_message',
      content: [
        {
          type: 'text',
          text: 'Edit the files and run a command.\nKeep it short.',
        },
      ],
    });
    expect(new Set(rows.map((row) => row.turnId)).size).toBe(1);
    expect(
      database.select().from(turn).where(eq(turn.sessionId, sessionId)).all(),
    ).toEqual([
      expect.objectContaining({
        id: rows[0]?.turnId,
        model: expect.any(String),
      }),
    ]);
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    await waitFor(engine, (snapshot) => snapshot.status === 'done');
    expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  },
);

it.each(
  agentAdapters.flatMap((adapter) =>
    (
      [
        {
          availability: 'available',
          installStep: undefined,
          configOptions: expect.arrayContaining(
            ['mode', 'model', 'thought_level'].map((category) =>
              expect.objectContaining({ category }),
            ),
          ),
        },
        {
          availability: 'not_installed',
          installStep: expect.any(String),
          configOptions: [],
        },
        {
          availability: 'not_signed_in',
          installStep: expect.any(String),
          configOptions: [],
        },
      ] as const
    ).map((row) => ({ adapter, agent: adapter.agent, ...row })),
  ),
)(
  'reports $agent as $availability with its install step and New Session options',
  async ({ adapter, availability, installStep, configOptions }) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'image-prompt',
      availability,
      // Only the mock folder, so an absent mock is an absent Agent.
      searchPath: (bin) => bin,
    });
    const caller = await root.createCaller();
    const [information, ...others] = await caller.agents.list();
    expect(others).toEqual([]);
    expect(information).toMatchObject({
      agent: adapter.agent,
      label: expect.any(String),
      logo: expect.stringContaining('<svg'),
      availability,
    });
    expect(information?.installStep).toEqual(installStep);
    expect(information?.configOptions).toEqual(configOptions);
  },
);

it.each(
  agentAdapters.flatMap((adapter) =>
    (['not_installed', 'not_signed_in'] as const).map((availability) => ({
      adapter,
      agent: adapter.agent,
      availability,
    })),
  ),
)(
  'refuses a $agent Session whose Agent is $availability, leaving no Session, worktree or branch',
  async ({ adapter, availability }) => {
    // Git stays on PATH; any installed copy of the Agent's CLI does not.
    const otherDirectories = (process.env.PATH ?? '')
      .split(path.delimiter)
      .filter((directory) => !existsSync(path.join(directory, adapter.agent)));
    const root = await startNewSessionEngine(adapter, {
      availability,
      searchPath: (bin) => [bin, ...otherDirectories].join(path.delimiter),
    });
    const caller = await root.createCaller();
    await expect(
      caller.session.new({
        projectId: 'project-1',
        agent: adapter.agent,
        checkout: { type: 'worktree', baseBranch: 'feature' },
        configOptions: [],
        prompt: [{ type: 'text', text: 'Hello' }],
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(
      (await caller.session.list({ archived: false })).sessions.map(
        (row) => row.sessionId,
      ),
    ).toEqual(['session-1']);
    expect(root.git('worktree', 'list', '--porcelain')).not.toContain(
      root.home,
    );
    expect(root.git('branch', '--list', 'argo/*')).toBe('');
    expect(await caller.projects.list()).toEqual([
      expect.objectContaining({
        checkoutChoice: { type: 'worktree', baseBranch: 'main' },
      }),
    ]);
  },
);

it.each(
  agentAdapters.map((adapter) => {
    const permissionFeedback =
      mockClis[adapter.agent]?.permissionFeedback === true;
    const message = 'Use a read-only command instead';
    return {
      adapter,
      agent: adapter.agent,
      permissionFeedback,
      message: permissionFeedback ? message : undefined,
      recordedAnswer: {
        type: 'permission',
        optionId: 'reject_once',
        ...(permissionFeedback ? { message } : {}),
      },
    };
  }),
)(
  'delivers a $agent rejection to its CLI, with feedback where the Agent takes it',
  async ({ adapter, permissionFeedback, message, recordedAnswer }) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'permission',
    });
    const file = path.join(root.home, 'answers.jsonl');
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Run the command' }],
    });
    await expect
      .poll(
        async () =>
          (await readSnapshot(root.createCaller, sessionId)).pendingPermission,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingPermission;
    if (!pending) throw new Error('No Permission request');
    const session = root.engine.system.get(`session:${sessionId}`) as
      | SessionActorRef
      | undefined;
    expect(
      session?.getSnapshot().context.capabilities?.permissionFeedback,
    ).toBe(permissionFeedback);
    expect(
      await caller.session.answerPermission({
        sessionId,
        toolCallId: pending.toolCallId,
        optionId: 'reject_once',
        message,
      }),
    ).toEqual({});
    await expect.poll(() => readRequestAnswers(file)).toEqual([recordedAnswer]);
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    expect(
      await caller.feed.row({ sessionId, id: pending.toolCallId }),
    ).toMatchObject({
      _meta: {
        argo: {
          permissionOutcome: { outcome: 'selected', optionId: 'reject_once' },
        },
      },
    });
  },
);

it.each(
  agentAdapters
    .filter((adapter) => mockClis[adapter.agent]?.permissionFeedback === false)
    .map((adapter) => ({ adapter, agent: adapter.agent })),
)(
  'refuses rejection feedback $agent cannot take and keeps its Permission request pending',
  async ({ adapter }) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'permission',
    });
    const file = path.join(root.home, 'answers.jsonl');
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Run the command' }],
    });
    await expect
      .poll(
        async () =>
          (await readSnapshot(root.createCaller, sessionId)).pendingPermission,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingPermission;
    if (!pending) throw new Error('No Permission request');
    await expect(
      caller.session.answerPermission({
        sessionId,
        toolCallId: pending.toolCallId,
        optionId: 'reject_once',
        message: 'Use a read-only command instead',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'The Agent does not support Permission feedback',
    });
    expect(
      (await readSnapshot(root.createCaller, sessionId)).pendingPermission,
    ).toEqual(pending);
    expect(await readRequestAnswers(file)).toEqual([]);
  },
);

it.each(agentAdapters)(
  'answers a $agent Elicitation once through tRPC',
  async (adapter) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, 'answers.jsonl');
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Ask me a question' }],
    });
    await expect
      .poll(
        async () =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingElicitation;
    if (!pending) throw new Error('No Elicitation');
    const recorded =
      mockClis[adapter.agent]?.recordedRequestAnswer('elicitation');
    if (recorded?.type !== 'elicitation')
      throw new Error('No recorded Elicitation answer');
    const answer = {
      sessionId,
      requestId: pending.requestId,
      action: recorded.action,
      content: recorded.content,
    };
    await expect(
      caller.session.answerElicitation({
        ...answer,
        requestId: 'stale-request',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'already answered',
    });
    expect(
      (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
    ).toEqual(pending);
    const field = Object.keys(recorded.content ?? {})[0];
    if (!field) throw new Error('No recorded answer field');
    await expect(
      caller.session.answerElicitation({
        ...answer,
        content: { [field]: 42 },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(
      (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
    ).toEqual(pending);
    const results = await Promise.allSettled([
      caller.session.answerElicitation(answer),
      caller.session.answerElicitation(answer),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({
      reason: { code: 'CONFLICT', message: 'already answered' },
    });
    await expect.poll(() => readRequestAnswers(file)).toEqual([recorded]);
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    await expect(
      caller.session.answerElicitation(answer),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'already answered',
    });
  },
);

it.each(
  agentAdapters.flatMap((adapter) =>
    (['decline', 'cancel'] as const).map((action) => ({
      adapter,
      agent: adapter.agent,
      action,
    })),
  ),
)(
  '$action answers a $agent Elicitation without accepting its form',
  async ({ adapter, action }) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, 'answers.jsonl');
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Ask me a question' }],
    });
    await expect
      .poll(
        async () =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingElicitation;
    if (!pending) throw new Error('No Elicitation');
    await caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action,
    });
    await expect
      .poll(() => readRequestAnswers(file))
      .toEqual([{ type: 'elicitation', action }]);
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    await expect(
      caller.session.answerElicitation({
        sessionId,
        requestId: pending.requestId,
        action: 'accept',
        content: {},
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'already answered',
    });
  },
);

it.each(agentAdapters)(
  'cancels a $agent Turn with a pending Permission request and refuses a late answer',
  async (adapter) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'permission',
    });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Wait for my answer' }],
    });
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('requires_action');
    const before = await readSnapshot(root.createCaller, sessionId);
    if (!before.pendingPermission) throw new Error('No Permission request');
    await caller.session.cancel({ sessionId });
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    expect(await readSnapshot(root.createCaller, sessionId)).toMatchObject({
      pendingPermission: null,
      pendingElicitation: null,
    });
    await wait(cancellationSettleWait);
    const { rows } = await caller.feed.page({ sessionId, direction: 'tail' });
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionUpdate: 'notice',
          title: 'The Agent stopped unexpectedly',
        }),
      ]),
    );
    await expect(
      caller.session.answerPermission({
        sessionId,
        toolCallId: before.pendingPermission.toolCallId,
        optionId: 'allow_once',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'already answered',
    });
    expect(
      await caller.feed.row({
        sessionId,
        id: before.pendingPermission.toolCallId,
      }),
    ).toMatchObject({
      _meta: { argo: { permissionOutcome: { outcome: 'cancelled' } } },
    });
  },
);

it.each(agentAdapters)(
  'cancels a $agent Turn with a pending Elicitation and refuses a late answer',
  async (adapter) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Wait for my answer' }],
    });
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('requires_action');
    const before = await readSnapshot(root.createCaller, sessionId);
    if (!before.pendingElicitation) throw new Error('No Elicitation');
    await caller.session.cancel({ sessionId });
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    expect(await readSnapshot(root.createCaller, sessionId)).toMatchObject({
      pendingPermission: null,
      pendingElicitation: null,
    });
    await wait(cancellationSettleWait);
    const { rows } = await caller.feed.page({ sessionId, direction: 'tail' });
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionUpdate: 'notice',
          title: 'The Agent stopped unexpectedly',
        }),
      ]),
    );
    await expect(
      caller.session.answerElicitation({
        sessionId,
        requestId: before.pendingElicitation.requestId,
        action: 'accept',
        content: {},
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'already answered',
    });
  },
);

it.each(
  agentAdapters.flatMap((adapter) =>
    ['permission', 'elicitation'].map((recording) => ({
      adapter,
      agent: adapter.agent,
      recording,
    })),
  ),
)(
  'keeps a $agent $recording request answerable after two days',
  async ({ adapter, recording }) => {
    const root = await startNewSessionEngine(adapter, { recording });
    const file = path.join(root.home, 'answers.jsonl');
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Wait for my answer' }],
    });
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('requires_action');
    const before = await readSnapshot(root.createCaller, sessionId);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    await vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60 * 1000);
    expect(await readSnapshot(root.createCaller, sessionId)).toMatchObject({
      state: 'requires_action',
      pendingPermission: before.pendingPermission,
      pendingElicitation: before.pendingElicitation,
    });
    expect(readRequestAnswers(file)).toEqual([]);
    vi.useRealTimers();
    if (before.pendingPermission)
      await caller.session.answerPermission({
        sessionId,
        toolCallId: before.pendingPermission.toolCallId,
        optionId: 'allow_once',
      });
    if (before.pendingElicitation)
      await caller.session.answerElicitation({
        sessionId,
        requestId: before.pendingElicitation.requestId,
        action: 'decline',
      });
    await expect
      .poll(
        async () => (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
  },
);

it('removes its temporary folder when a start fails', async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'argo-leak-check-'));
  onTestFinished(() => rmSync(scratch, { recursive: true, force: true }));
  onTestFinished(() => {
    expect(readdirSync(scratch)).toEqual([]);
  });
  vi.stubEnv('TMPDIR', scratch);
  await expect(startNewSessionEngine(createMockAdapter())).rejects.toThrow(
    'No mock CLI',
  );
});

it('stops a started Engine when the test finishes', () => {
  let started: ReturnType<typeof startEngine>['engine'] | undefined;
  onTestFinished(() => {
    expect(started?.getSnapshot().status).toBe('done');
  });
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  started = startEngine({ database, adapter: createMockAdapter() }).engine;
  expect(started.getSnapshot().status).toBe('active');
});

for (const adapter of agentAdapters)
  it(`keeps other ${adapter.agent} Sessions usable after a Feed actor fails`, async () => {
    const failure = new Error('Feed failed on its first change');
    const sessions = registryMachine.provide({
      actors: {
        session: sessionMachine.provide({
          actors: {
            feed: feedMachine.provide({
              actions: {
                sendToWriter: ({ context, system }, { job }) => {
                  if (context.sessionId === 'session-broken') throw failure;
                  system
                    .get('databaseWriter')
                    .send({ type: 'writer.write', job });
                },
              },
            }),
          },
        }),
      },
    });
    const root = await startNewSessionEngine(adapter, { sessions });
    insertSession(root.database, {
      id: 'session-broken',
      agent: adapter.agent,
      checkoutPath: root.project,
    });
    insertSession(root.database, {
      id: 'session-2',
      agent: adapter.agent,
      checkoutPath: root.project,
    });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());
    const caller = await root.createCaller(controller.signal);
    const list = (await caller.session.listUpdates())[Symbol.asyncIterator]();
    await list.next();
    const feed = (
      await caller.feed.subscribe({ sessionId: 'session-broken', after: null })
    )[Symbol.asyncIterator]();
    expect((await feed.next()).value).toMatchObject({ type: 'snapshot' });
    const rejectedFeed = expect(feed.next()).rejects.toThrow(failure.message);
    const engineErrors: unknown[] = [];
    root.engine.subscribe({ error: (error) => engineErrors.push(error) });
    await caller.session.prompt({
      sessionId: 'session-broken',
      prompt: [{ type: 'text', text: 'First Session' }],
    });
    await rejectedFeed;
    await expect
      .poll(() => root.engine.system.get('session:session-broken'))
      .toBeUndefined();
    await caller.session.prompt({
      sessionId: 'session-2',
      prompt: [{ type: 'text', text: 'Finish this Turn' }],
    });
    await expect
      .poll(async () => {
        const snapshot = await readSnapshot(root.createCaller, 'session-2');
        return snapshot.state;
      })
      .toBe('idle');
    await expect
      .poll(async () =>
        (
          await caller.feed.page({ sessionId: 'session-2', direction: 'tail' })
        ).rows.some((row) => row.sessionUpdate === 'agent_message'),
      )
      .toBe(true);
    expect(root.engine.getSnapshot().status).toBe('active');
    expect(engineErrors).toEqual([]);
    controller.abort();
    await list.return?.();
  });

it('shares one coalesced list read for three subscribers across fifty changes', async () => {
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
  onTestFinished(() => {
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
    const writer = engine.system.get('databaseWriter') as ActorRefFrom<
      typeof writerMachine
    >;
    for (let index = 1; index <= 50; index += 1)
      writer.send({
        type: 'writer.write',
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
      type: 'writer.write',
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
      type: 'writer.write',
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

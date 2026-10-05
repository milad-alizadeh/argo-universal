import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type AgentAdapter, agentAdapters } from '@repo/agents';
import { appRouter, type Services } from '@repo/api';
import type { SessionListUpdate } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { mockClis } from '@repo/mocks/cli';
import { expect, it, vi } from 'vitest';
import type { ActorRefFrom } from 'xstate';
import { createActor, fromCallback, fromPromise, waitFor } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import type { writerMachine } from '../services/feed/writer-machine';
import { createServerServices } from '../services/server-services';
import type { HttpServerOptions } from './http-server';
import { engineMachine } from './machine';

function startEngine({
  database,
  adapter,
  home = '/unused',
  closeDatabase = () => {},
}: {
  database: ReturnType<typeof openTestDatabase>['database'];
  adapter: AgentAdapter;
  home?: string;
  closeDatabase?: () => void;
}) {
  let services: Services | undefined;
  const machine = engineMachine.provide({
    actors: {
      openDatabase: fromPromise(async () => database),
      processSignals: fromCallback(() => {}),
      startHttpServer: fromPromise(
        async ({ input }: { input: HttpServerOptions }) => {
          services = createServerServices(input);
          return { close: async () => {} };
        },
      ),
    },
    actions: { log: () => {}, sendToSupervisor: () => {}, closeDatabase },
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

it('serves live Session procedures and drains their Feed before closing the database', async () => {
  const { database, remove } = openTestDatabase();
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
  try {
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
  } finally {
    engine.stop();
    remove();
  }
});

it.each(agentAdapters)(
  'serves a recorded $agent Turn through tRPC and stores it under one Argo Turn id',
  async (adapter) => {
    const directory = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'argo-composition-')),
    );
    const mockCli = mockClis[adapter.agent];
    if (!mockCli) throw new Error(`No mock CLI for ${adapter.agent}`);
    await mockCli.write(directory, { recording: mockCli.recordings.turn });
    vi.stubEnv(
      'PATH',
      `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
    );
    for (const [key, value] of Object.entries(
      mockCli.writeTranscript(directory, directory, crypto.randomUUID()),
    ))
      vi.stubEnv(key, value);
    const { database, remove } = openTestDatabase(
      { agent: adapter.agent, checkoutPath: directory },
      directory,
    );
    const { engine, createCaller } = startEngine({
      database,
      adapter,
      home: directory,
    });
    try {
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
    } finally {
      engine.stop();
      remove();
      vi.unstubAllEnvs();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

it('lists only top-level Sessions, searches literal titles, filters archives and pages tied activity', async () => {
  const { database, remove } = openTestDatabase({
    title: 'Earlier',
    activityAt: 1,
  });
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
  const { engine, createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  try {
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
  } finally {
    engine.stop();
    remove();
  }
});

it('sends live list changes and attention/running counts through request and Turn transitions', async () => {
  const { database, remove } = openTestDatabase();
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
  try {
    const caller = await createCaller(controller.signal);
    const counts = (await caller.session.counts())[Symbol.asyncIterator]();
    const updates = (await caller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
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
        options: [],
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
        async () =>
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
  } finally {
    controller.abort();
    engine.stop();
    remove();
  }
});

it('seeds the Project from ARGO_PROJECT_PATH at Engine startup', async () => {
  const directory = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'argo-seed-')),
  );
  vi.stubEnv('ARGO_PROJECT_PATH', process.cwd());
  let services: Services | undefined;
  const engine = createActor(
    engineMachine.provide({
      actors: {
        processSignals: fromCallback(() => {}),
        startHttpServer: fromPromise(
          async ({ input }: { input: HttpServerOptions }) => {
            services = createServerServices(input);
            return { close: async () => {} };
          },
        ),
      },
      actions: { log: () => {}, sendToSupervisor: () => {} },
    }),
    {
      input: {
        home: directory,
        port: 7337,
        version: '1',
        startedAt: new Date().toISOString(),
        adapters: [],
      },
    },
  ).start();
  try {
    await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));
    if (!services) throw new Error('No services');
    const caller = appRouter.createCaller({ services });
    const projects = await caller.projects.list();
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      name: 'argo-universal',
      checkoutChoice: { type: 'worktree', baseBranch: expect.any(String) },
    });
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    await waitFor(engine, (snapshot) => snapshot.status === 'done');
  } finally {
    engine.stop();
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  }
});

it('uses the newest Turn for failures and excludes interrupted Turns from Failed', async () => {
  const { database, remove } = openTestDatabase({ maxRevision: 2 });
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
  const { engine, createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  try {
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
  } finally {
    engine.stop();
    remove();
  }
});

it('publishes stored list changes, changes counts only when needed, and aborts a waiting subscription', async () => {
  const { database, remove } = openTestDatabase({
    maxRevision: 1,
    title: 'Unread',
  });
  const { engine, createCaller } = startEngine({
    database,
    adapter: createMockAdapter(),
  });
  const controller = new AbortController();
  try {
    const caller = await createCaller(controller.signal);
    const counts = (await caller.session.counts())[Symbol.asyncIterator]();
    const updates = (await caller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
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
    expect((await caller.session.list({ archived: false })).sessions).toEqual(
      [],
    );
    const waiting = counts.next();
    controller.abort();
    expect(await waiting).toMatchObject({ done: true });
    await updates.return?.();
  } finally {
    controller.abort();
    engine.stop();
    remove();
  }
});

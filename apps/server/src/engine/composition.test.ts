import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type AgentAdapter, agentAdapters } from '@repo/agents';
import { appRouter, type Services } from '@repo/api';
import type { SessionListUpdate } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { listBranches } from '@repo/git';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { mockClis } from '@repo/mocks/cli';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import type { ActorRefFrom } from 'xstate';
import { createActor, fromCallback, fromPromise, waitFor } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { initTestRepository } from '#mocks/git';
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

// An Engine on a Project whose `feature` branch is one commit ahead of `main`, with the Agent's mock CLI on PATH; `close` stops it and deletes everything.
async function startNewSessionEngine(
  adapter: AgentAdapter,
  {
    recording,
    availability,
    searchPath = (bin) => `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
  }: {
    recording?: string;
    availability?: 'available' | 'not_installed' | 'not_signed_in';
    searchPath?: (bin: string) => string;
  } = {},
) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'argo-new-')));
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
  const { engine, createCaller } = startEngine({ database, adapter, home });
  return {
    project,
    home,
    git,
    database,
    engine,
    createCaller,
    close: () => {
      engine.stop();
      remove();
      vi.unstubAllEnvs();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

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
    try {
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
    } finally {
      root.close();
    }
  },
);

it.each(
  agentAdapters.flatMap((adapter) =>
    (['available', 'not_installed', 'not_signed_in'] as const).map(
      (availability) => ({ adapter, agent: adapter.agent, availability }),
    ),
  ),
)(
  'reports $agent as $availability with its install step and New Session options',
  async ({ adapter, availability }) => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'image-prompt',
      availability,
      // Only the mock folder, so an absent mock is an absent Agent.
      searchPath: (bin) => bin,
    });
    try {
      const caller = await root.createCaller();
      const [information, ...others] = await caller.agents.list();
      expect(others).toEqual([]);
      expect(information).toMatchObject({
        agent: adapter.agent,
        label: expect.any(String),
        logo: expect.stringContaining('<svg'),
        availability,
      });
      if (availability === 'available') {
        expect(information?.installStep).toBeUndefined();
        expect(information?.configOptions).toEqual(
          expect.arrayContaining(
            ['mode', 'model', 'thought_level'].map((category) =>
              expect.objectContaining({ category }),
            ),
          ),
        );
      } else {
        expect(information?.installStep).toEqual(expect.any(String));
        expect(information?.configOptions).toEqual([]);
      }
    } finally {
      root.close();
    }
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
    try {
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
    } finally {
      root.close();
    }
  },
);

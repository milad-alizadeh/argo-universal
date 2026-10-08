import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { type AgentAdapter, agentAdapters } from '@repo/agents';
import { appRouter, type Services } from '@repo/api';
import type {
  AgentAvailability,
  FeedSubscribeOutput,
  SessionAnswerElicitationInput,
  SessionNewInput,
  SessionConfigSelectOption,
  SessionInfo,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import type {
  SessionListUpdate,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { feedRow, session, turn } from '@repo/db/schema';
import { listBranches, sessionBranch } from '@repo/git';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { mockClis } from '@repo/mocks/cli';
import {
  type MockCliScenarioInput,
  mockCliScenarioEnvironment,
} from '@repo/mocks/cli/mock-cli';
import { readRequestAnswers } from '@repo/mocks/cli/request-answer';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import type { Actor } from 'xstate';
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
import { type WriterJob, writeJobs } from '../services/feed/writer-job';
import { writerMachine } from '../services/feed/writer-machine';
import { createServerServices } from '../services/server-services';
import { registryMachine } from '../services/sessions/registry-machine';
import type { SessionActorRef } from '../services/sessions/session-machine';
import { sessionMachine } from '../services/sessions/session-machine';
import type { HttpServerOptions } from './http-server';
import { engineMachine } from './machine';

const stopEngineEvent = 'engine.stop';
const agentFeedEvent = 'agent.feed';
const checkingTestsThought = 'Checking the tests';
const secondRetryNotice = 'Retrying (2 of 5)';
const firstListRejection = 'sessions: rejected list shape #1';
const editingPrompt = 'Edit the files and run a command.';
const writeFeedEvent = 'writer.write';
const commandPrompt = 'Run the command';
const missingPermissionRequestFailure = 'No Permission request';
const answeredRequestFailure = 'already answered';
const recordedAnswersFile = 'answers.jsonl';
const twoQuestionsPrompt = 'Ask two questions';
const missingElicitationFailure = 'No Elicitation';
const waitingForAnswerPrompt = 'Wait for my answer';
const brokenSessionId = 'session-broken';
const unobservedTitle = 'Changed alone';

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
type AvailabilityCase = { adapter: AgentAdapter; agent: string } & (
  | {
      availability: 'available';
      installStep: undefined;
      configOptions: ReturnType<typeof expect.arrayContaining>;
    }
  | {
      availability: 'not_installed' | 'not_signed_in';
      installStep: ReturnType<typeof expect.any>;
      configOptions: readonly [];
    }
);

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
type CheckoutCase = {
  adapter: AgentAdapter;
  agent: AgentAdapter['agent'];
  checkout: SessionNewInput['checkout'];
};
type UnavailableAgentCase = {
  adapter: AgentAdapter;
  agent: AgentAdapter['agent'];
  availability: Exclude<AgentAvailability, 'available' | 'unavailable'>;
};
type DeclinedElicitationCase = {
  adapter: AgentAdapter;
  agent: AgentAdapter['agent'];
  action: Exclude<SessionAnswerElicitationInput['action'], 'accept'>;
};
type RecordedRequestCase = {
  adapter: AgentAdapter;
  agent: AgentAdapter['agent'];
  recording: string;
};

// The longest the teardown waits for the Engine's graceful stop.
const gracefulStopLimit = 5_000;

// A crash Notice can land after the Session first reports idle.
const cancellationSettleWait = 200;

// An Engine on a mock Agent; without `database` it opens and closes its real database in `home`. It stops itself when the test ends.
function startEngine({
  database,
  adapter,
  home = '/unused',
  closeDatabase = (): void => {},
  sessions = registryMachine,
  databaseWriter = writerMachine,
}: {
  database?: ReturnType<typeof openTestDatabase>['database'];
  adapter: AgentAdapter;
  home?: string;
  closeDatabase?: () => void;
  sessions?: typeof registryMachine;
  databaseWriter?: typeof writerMachine;
}): StartedEngine {
  let services: Services | undefined;
  const machine = engineMachine.provide({
    actors: {
      ...(database && {
        openDatabase: fromPromise(
          async (): Promise<import('@repo/db').Database> => database,
        ),
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
          services = createServerServices({
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
    },
  }).start();
  onTestFinished(async (): Promise<void> => {
    // Fake timers would leave the wait hanging.
    vi.useRealTimers();
    try {
      if (engine.getSnapshot().status !== 'done') {
        engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
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
      if (!services) throw new Error('No services');
      return appRouter.createCaller({ services }, { signal });
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
    await expectActivity(checkingTestsThought);
    sendRow(retry);
    await expectActivity(secondRetryNotice);
    // Settled rows have left the Feed actor by now; a fresh subscription must retain the retry.
    const reconnect = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    expect((await reconnect.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        liveHeader: {
          text: secondRetryNotice,
          source: { type: 'retry' },
          startedAt: expect.any(Number),
        },
      },
    });
    for (const row of progress) {
      sendRow(retry);
      await expectActivity(secondRetryNotice);
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
      await expectActivity(checkingTestsThought);
    }
    sendRow({ ...command, status: 'completed', state: 'settled' });
    await expectActivity(checkingTestsThought);
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
      firstListRejection,
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
      firstListRejection,
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
  engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
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

it.each(agentAdapters)(
  'serves a recorded $agent Turn through tRPC and stores it under one Argo Turn id',
  async (adapter): Promise<void> => {
    const directory = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'argo-composition-')),
    );
    onTestFinished((): void =>
      rmSync(directory, { recursive: true, force: true }),
    );
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
      prompt: [{ type: 'text', text: editingPrompt }],
    });
    await expect
      .poll(
        async (): Promise<boolean> => {
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
    engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
    await waitFor(
      engine,
      (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
        snapshot.status === 'done',
    );
    const { rows } = await caller.feed.page({
      sessionId: 'session-1',
      direction: 'tail',
    });
    expect(rows[0]).toMatchObject({
      id: messageId,
      sessionUpdate: 'user_message',
      content: [{ type: 'text', text: editingPrompt }],
    });
    expect(
      rows.filter(
        (
          row,
        ): row is Extract<SessionUpdate, { sessionUpdate: 'user_message' }> =>
          row.sessionUpdate === 'user_message',
      ),
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
    expect(new Set(rows.map((row): string | null => row.turnId)).size).toBe(1);
    expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  },
);

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
  const writer = engine.system.get('databaseWriter') as ActorRefFrom<
    typeof writerMachine
  >;
  for (const sessionId of ['archived', 'subagent'])
    writer.send({
      type: writeFeedEvent,
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
  engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
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
  const writer = engine.system.get('databaseWriter') as ActorRefFrom<
    typeof writerMachine
  >;
  const waitingCounts = counts.next();
  writer.send({
    type: writeFeedEvent,
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
    type: writeFeedEvent,
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
const stubScenario = (scenario: MockCliScenarioInput): void => {
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
    searchPath = (bin): string =>
      `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
  }: {
    sessions?: typeof registryMachine;
    recording?: string;
    availability?: 'available' | 'not_installed' | 'not_signed_in';
    searchPath?: (bin: string) => string;
  } = {},
): Promise<
  StartedEngine & {
    project: string;
    home: string;
    git: ReturnType<typeof initTestRepository>;
    database: ReturnType<typeof openTestDatabase>['database'];
  }
> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'argo-new-')));
  onTestFinished((): void => rmSync(root, { recursive: true, force: true }));
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
      async (): Promise<void> => {
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
          prompt: [{ type: 'text', text: commandPrompt }],
        });
        await expect
          .poll(
            async (): Promise<SessionSnapshot['pendingPermission']> =>
              (await readSnapshot(root.createCaller, sessionId))
                .pendingPermission,
          )
          .not.toBeNull();
        const request = (await readSnapshot(root.createCaller, sessionId))
          .pendingPermission;
        if (!request) throw new Error(missingPermissionRequestFailure);
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
          message: answeredRequestFailure,
        });
        await expect
          .poll(
            async (): Promise<SessionSnapshot['state']> =>
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
  agentAdapters.flatMap((adapter): CheckoutCase[] =>
    (
      [{ type: 'worktree', baseBranch: 'feature' }, { type: 'main' }] as const
    ).map((checkout): CheckoutCase => ({
      adapter,
      agent: adapter.agent,
      checkout,
    })),
  ),
)(
  'starts a $agent Session in the $checkout.type checkout and runs its first Turn in one call',
  async ({ adapter, checkout }): Promise<void> => {
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
    const created = listed.find((row): boolean => row.sessionId === sessionId);
    expect(created).toMatchObject({
      agent: adapter.agent,
      title: editingPrompt,
      titleSource: 'prompt',
      checkout:
        checkout.type === 'main'
          ? { type: 'main', path: root.project, branch: 'main' }
          : {
              type: 'worktree',
              path: path.join(root.home, 'worktrees', 'project-1', sessionId),
              branch: sessionBranch(sessionId),
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
        async (): Promise<boolean> => {
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
    expect(new Set(rows.map((row): string | null => row.turnId)).size).toBe(1);
    expect(
      database.select().from(turn).where(eq(turn.sessionId, sessionId)).all(),
    ).toEqual([
      expect.objectContaining({
        id: rows[0]?.turnId,
        model: expect.any(String),
      }),
    ]);
    engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
    await waitFor(
      engine,
      (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
        snapshot.status === 'done',
    );
    expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  },
);

it.each(
  agentAdapters.flatMap((adapter): AvailabilityCase[] =>
    (
      [
        {
          availability: 'available',
          installStep: undefined,
          configOptions: expect.arrayContaining(
            ['mode', 'model', 'thought_level'].map(
              (category): ReturnType<typeof expect.objectContaining> =>
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
    ).map((row): AvailabilityCase => ({
      adapter,
      agent: adapter.agent,
      ...row,
    })),
  ),
)(
  'reports $agent as $availability with its install step and New Session options',
  async ({
    adapter,
    availability,
    installStep,
    configOptions,
  }): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'image-prompt',
      availability,
      // Only the mock folder, so an absent mock is an absent Agent.
      searchPath: (bin): string => bin,
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
  agentAdapters.flatMap((adapter): UnavailableAgentCase[] =>
    (['not_installed', 'not_signed_in'] as const).map(
      (availability): UnavailableAgentCase => ({
        adapter,
        agent: adapter.agent,
        availability,
      }),
    ),
  ),
)(
  'refuses a $agent Session whose Agent is $availability, leaving no Session, worktree or branch',
  async ({ adapter, availability }): Promise<void> => {
    // Git stays on PATH; any installed copy of the Agent's CLI does not.
    const otherDirectories = (process.env.PATH ?? '')
      .split(path.delimiter)
      .filter(
        (directory): boolean =>
          !existsSync(path.join(directory, adapter.agent)),
      );
    const root = await startNewSessionEngine(adapter, {
      availability,
      searchPath: (bin): string =>
        [bin, ...otherDirectories].join(path.delimiter),
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
        (row): string => row.sessionId,
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
  agentAdapters.map(
    (
      adapter,
    ): {
      adapter: AgentAdapter<unknown, unknown>;
      agent: string;
      permissionFeedback: boolean;
      message: string | undefined;
      recordedAnswer: {
        type: string;
        optionId: string;
        message?: string;
      };
    } => {
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
    },
  ),
)(
  'delivers a $agent rejection to its CLI, with feedback where the Agent takes it',
  async ({
    adapter,
    permissionFeedback,
    message,
    recordedAnswer,
  }): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'permission',
    });
    const file = path.join(root.home, recordedAnswersFile);
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: commandPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['pendingPermission']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingPermission,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingPermission;
    if (!pending) throw new Error(missingPermissionRequestFailure);
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
    await expect
      .poll((): ReturnType<typeof readRequestAnswers> =>
        readRequestAnswers(file),
      )
      .toEqual([recordedAnswer]);
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
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
    .filter(
      (adapter): boolean =>
        mockClis[adapter.agent]?.permissionFeedback === false,
    )
    .map(
      (
        adapter,
      ): { adapter: AgentAdapter<unknown, unknown>; agent: string } => ({
        adapter,
        agent: adapter.agent,
      }),
    ),
)(
  'refuses rejection feedback $agent cannot take and keeps its Permission request pending',
  async ({ adapter }): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'permission',
    });
    const file = path.join(root.home, recordedAnswersFile);
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: commandPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['pendingPermission']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingPermission,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingPermission;
    if (!pending) throw new Error(missingPermissionRequestFailure);
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

for (const adapter of agentAdapters)
  it
    .skipIf(
      mockClis[adapter.agent]?.unsupportedScenarios.includes(
        'otherThreadRequest',
      ),
    )
    .each([
      {
        recording: 'permission',
        expected: { type: 'permission', optionId: 'reject_once' },
      },
      {
        recording: 'elicitation',
        expected: { type: 'elicitation', action: 'decline' },
      },
    ])(
    `answers a ${adapter.agent} other-thread $recording request; skipped where requests have no thread id`,
    async ({ recording, expected }): Promise<void> => {
      const root = await startNewSessionEngine(adapter, { recording });
      const file = path.join(root.home, recordedAnswersFile);
      stubScenario({ otherThreadRequest: true, requestAnswersFile: file });
      const caller = await root.createCaller();
      const { sessionId } = await caller.session.new({
        projectId: 'project-1',
        agent: adapter.agent,
        checkout: { type: 'main' },
        configOptions: [],
        prompt: [{ type: 'text', text: 'Run a Turn' }],
      });
      await expect
        .poll((): ReturnType<typeof readRequestAnswers> =>
          readRequestAnswers(file),
        )
        .toEqual([expected]);
      await expect
        .poll(
          async (): Promise<SessionSnapshot['state']> =>
            (await readSnapshot(root.createCaller, sessionId)).state,
        )
        .toBe('idle');
      expect(await readSnapshot(root.createCaller, sessionId)).toMatchObject({
        pendingPermission: null,
        pendingElicitation: null,
      });
    },
  );

it.each(agentAdapters)(
  'cancel answers every $agent queued question',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, recordedAnswersFile);
    stubScenario({ concurrentQuestions: true, requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: twoQuestionsPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['pendingElicitation']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    await caller.session.cancel({ sessionId });
    await expect
      .poll((): ReturnType<typeof readRequestAnswers> =>
        readRequestAnswers(file),
      )
      .toHaveLength(2);
    expect(await readRequestAnswers(file)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'accept' })]),
    );
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    expect(
      (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
    ).toBeNull();
  },
);

it.each(agentAdapters)(
  'stop answers every $agent queued question',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, recordedAnswersFile);
    stubScenario({ concurrentQuestions: true, requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: twoQuestionsPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['pendingElicitation']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    root.engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
    await waitFor(
      root.engine,
      (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
        snapshot.status === 'done',
      {
        timeout: gracefulStopLimit,
      },
    );
    expect(await readRequestAnswers(file)).toHaveLength(2);
    expect(await readRequestAnswers(file)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'accept' })]),
    );
    expect(root.engine.getSnapshot().output).toEqual({ exitCode: 0 });
  },
);

it.each(agentAdapters)(
  'shows two $agent questions in FIFO order and answers both',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, recordedAnswersFile);
    stubScenario({ concurrentQuestions: true, requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: twoQuestionsPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['pendingElicitation']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    const first = (await readSnapshot(root.createCaller, sessionId))
      .pendingElicitation;
    if (!first) throw new Error('No first Elicitation');
    expect(first.toolCallId).not.toContain('-second');
    expect(await readRequestAnswers(file)).toEqual([]);
    const recorded =
      mockClis[adapter.agent]?.recordedRequestAnswer('elicitation');
    if (recorded?.type !== 'elicitation')
      throw new Error('No recorded Elicitation answer');
    await caller.session.answerElicitation({
      sessionId,
      requestId: first.requestId,
      action: 'accept',
      content: recorded.content,
    });
    await expect
      .poll(
        async (): Promise<string | undefined> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation
            ?.toolCallId,
      )
      .toContain('-second');
    const second = (await readSnapshot(root.createCaller, sessionId))
      .pendingElicitation;
    if (!second) throw new Error('No second Elicitation');
    expect(second.requestId).not.toBe(first.requestId);
    await expect
      .poll((): ReturnType<typeof readRequestAnswers> =>
        readRequestAnswers(file),
      )
      .toEqual([recorded]);
    await caller.session.answerElicitation({
      sessionId,
      requestId: second.requestId,
      action: 'accept',
      content: recorded.content,
    });
    await expect
      .poll((): ReturnType<typeof readRequestAnswers> =>
        readRequestAnswers(file),
      )
      .toEqual([recorded, recorded]);
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    expect(
      (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
    ).toBeNull();
  },
);

it.each(agentAdapters)(
  'answers a $agent Elicitation once through tRPC',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, recordedAnswersFile);
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
        async (): Promise<SessionSnapshot['pendingElicitation']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingElicitation;
    if (!pending) throw new Error(missingElicitationFailure);
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
      message: answeredRequestFailure,
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
      results.filter(
        (result): result is PromiseFulfilledResult<Record<string, never>> =>
          result.status === 'fulfilled',
      ),
    ).toHaveLength(1);
    expect(
      results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      ),
    ).toMatchObject({
      reason: { code: 'CONFLICT', message: answeredRequestFailure },
    });
    await expect
      .poll((): ReturnType<typeof readRequestAnswers> =>
        readRequestAnswers(file),
      )
      .toEqual([recorded]);
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    await expect(
      caller.session.answerElicitation(answer),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: answeredRequestFailure,
    });
  },
);

it.each(
  agentAdapters.flatMap((adapter): DeclinedElicitationCase[] =>
    (['decline', 'cancel'] as const).map((action): DeclinedElicitationCase => ({
      adapter,
      agent: adapter.agent,
      action,
    })),
  ),
)(
  '$action answers a $agent Elicitation without accepting its form',
  async ({ adapter, action }): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const file = path.join(root.home, recordedAnswersFile);
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
        async (): Promise<SessionSnapshot['pendingElicitation']> =>
          (await readSnapshot(root.createCaller, sessionId)).pendingElicitation,
      )
      .not.toBeNull();
    const pending = (await readSnapshot(root.createCaller, sessionId))
      .pendingElicitation;
    if (!pending) throw new Error(missingElicitationFailure);
    await caller.session.answerElicitation({
      sessionId,
      requestId: pending.requestId,
      action,
    });
    await expect
      .poll((): ReturnType<typeof readRequestAnswers> =>
        readRequestAnswers(file),
      )
      .toEqual([{ type: 'elicitation', action }]);
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
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
      message: answeredRequestFailure,
    });
  },
);

it.each(agentAdapters)(
  'cancels a $agent Turn with a pending Permission request and refuses a late answer',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'permission',
    });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: waitingForAnswerPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('requires_action');
    const before = await readSnapshot(root.createCaller, sessionId);
    if (!before.pendingPermission)
      throw new Error(missingPermissionRequestFailure);
    await caller.session.cancel({ sessionId });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
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
      message: answeredRequestFailure,
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
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'elicitation',
    });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: waitingForAnswerPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('requires_action');
    const before = await readSnapshot(root.createCaller, sessionId);
    if (!before.pendingElicitation) throw new Error(missingElicitationFailure);
    await caller.session.cancel({ sessionId });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
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
      message: answeredRequestFailure,
    });
  },
);

it.each(
  agentAdapters.flatMap((adapter): RecordedRequestCase[] =>
    ['permission', 'elicitation'].map((recording): RecordedRequestCase => ({
      adapter,
      agent: adapter.agent,
      recording,
    })),
  ),
)(
  'keeps a $agent $recording request answerable after two days',
  async ({ adapter, recording }): Promise<void> => {
    const root = await startNewSessionEngine(adapter, { recording });
    const file = path.join(root.home, recordedAnswersFile);
    stubScenario({ requestAnswersFile: file });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: waitingForAnswerPrompt }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
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
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
  },
);

it('removes its temporary folder when a start fails', async (): Promise<void> => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'argo-leak-check-'));
  onTestFinished((): void => rmSync(scratch, { recursive: true, force: true }));
  onTestFinished((): void => {
    expect(readdirSync(scratch)).toEqual([]);
  });
  vi.stubEnv('TMPDIR', scratch);
  await expect(startNewSessionEngine(createMockAdapter())).rejects.toThrow(
    'No mock CLI',
  );
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

for (const adapter of agentAdapters)
  it(`keeps other ${adapter.agent} Sessions usable after a Feed actor fails`, async (): Promise<void> => {
    const failure = new Error('Feed failed on its first change');
    const sessions = registryMachine.provide({
      actors: {
        session: sessionMachine.provide({
          actors: {
            feed: feedMachine.provide({
              actions: {
                sendToWriter: ({ context, system }, { job }): void => {
                  if (context.sessionId === brokenSessionId) throw failure;
                  system
                    .get('databaseWriter')
                    .send({ type: writeFeedEvent, job });
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
    const rejectedFeed = expect(
      (async (): Promise<void> => {
        for await (const event of {
          [Symbol.asyncIterator]: (): AsyncIterator<
            FeedSubscribeOutput,
            void
          > => feed,
        })
          expect(event).toMatchObject({ type: 'snapshot' });
      })(),
    ).rejects.toThrow(failure.message);
    const engineErrors: unknown[] = [];
    root.engine.subscribe({
      error: (error): number => engineErrors.push(error),
    });
    await caller.session.prompt({
      sessionId: brokenSessionId,
      prompt: [{ type: 'text', text: 'First Session' }],
    });
    await rejectedFeed;
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
        const snapshot = await readSnapshot(root.createCaller, 'session-2');
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
    const writer = engine.system.get('databaseWriter') as ActorRefFrom<
      typeof writerMachine
    >;
    for (let index = 1; index <= 50; index += 1)
      writer.send({
        type: writeFeedEvent,
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
      type: writeFeedEvent,
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
      type: writeFeedEvent,
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

for (const adapter of agentAdapters) {
  it(`rejects a new ${adapter.agent} Session when CLI initialization exceeds agentStartLimit`, async (): Promise<void> => {
    stubScenario({ blockInitialize: true });
    const root = await startNewSessionEngine(adapter);
    const caller = await root.createCaller();
    await expect(
      caller.session.new({
        projectId: 'project-1',
        agent: adapter.agent,
        checkout: { type: 'worktree', baseBranch: 'feature' },
        configOptions: [],
        prompt: [{ type: 'text', text: 'Start the Session' }],
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message:
        'Agent startup exceeded agentStartLimit (10000 ms). Retry the Session.',
    });
    await expect
      .poll((): string => root.git('branch', '--list', 'argo/*').trim())
      .toBe('');
    expect(root.git('worktree', 'list')).not.toContain(root.home);
    expect(
      (await caller.session.list({ archived: false })).sessions,
    ).not.toContainEqual(
      expect.objectContaining({ title: 'Start the Session' }),
    );
    stubScenario({});
    expect(
      await caller.session.new({
        projectId: 'project-1',
        agent: adapter.agent,
        checkout: { type: 'main' },
        configOptions: [],
        prompt: [{ type: 'text', text: 'Retry the Session' }],
      }),
    ).toEqual({ sessionId: expect.any(String) });
  }, 15_000);

  it(`rejects a new ${adapter.agent} Session when a Checkout hook exceeds checkoutLimit`, async (): Promise<void> => {
    const root = await startNewSessionEngine(adapter);
    const marker = path.join(root.home, 'hook-started');
    const hook = path.join(root.project, '.git', 'hooks', 'post-checkout');
    writeFileSync(
      hook,
      [
        '#!/bin/sh',
        'checkout=$(/bin/pwd)',
        `echo "$checkout" > '${marker}'`,
        'while [ -d "$checkout" ]; do /bin/sleep 0.01; done',
        '',
      ].join('\n'),
      { mode: 0o755 },
    );
    const caller = await root.createCaller();
    const creation = caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'worktree', baseBranch: 'feature' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Wait for Checkout' }],
    });
    const rejected = expect(creation).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message:
        'Checkout creation exceeded checkoutLimit (10000 ms). Retry the Session.',
    });
    await expect.poll((): boolean => existsSync(marker)).toBe(true);
    const checkoutPath = readFileSync(marker, 'utf8').trim();
    expect(checkoutPath).toContain(path.join(root.home, 'worktrees'));
    expect(existsSync(checkoutPath)).toBe(true);
    await rejected;
    await expect.poll((): boolean => existsSync(checkoutPath)).toBe(false);
    await expect
      .poll((): string => root.git('branch', '--list', 'argo/*').trim())
      .toBe('');
    expect(root.git('worktree', 'list')).not.toContain(checkoutPath);
    rmSync(hook);
    expect(
      await caller.session.new({
        projectId: 'project-1',
        agent: adapter.agent,
        checkout: { type: 'worktree', baseBranch: 'feature' },
        configOptions: [],
        prompt: [{ type: 'text', text: 'Retry the Checkout' }],
      }),
    ).toEqual({ sessionId: expect.any(String) });
  }, 15_000);
}

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
      type: writeFeedEvent,
      job: {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { title: unobservedTitle, maxRevision: 1 },
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await changed).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1', title: unobservedTitle },
    });
    expect(counted.metrics.queries).toBeLessThanOrEqual(5);
    expect(counted.metrics.rows).toBeLessThanOrEqual(3);
    counted.metrics.queries = 0;
    const page = await caller.session.list({ archived: false });
    expect(page.sessions[0]).toMatchObject({
      sessionId: 'session-1',
      title: unobservedTitle,
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
    type: writeFeedEvent,
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
          void,
          { database: Parameters<typeof writeJobs>[0]; jobs: WriterJob[] }
        >(async ({ input }): Promise<void> => {
          await batch.promise;
          writeJobs(input.database, input.jobs);
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
      type: writeFeedEvent,
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
      type: writeFeedEvent,
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
      type: writeFeedEvent,
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

it.each(agentAdapters)(
  'holds a $agent model choice until the next Turn',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'interrupt',
    });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Ask before making a choice' }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('running');
    const before = await readSnapshot(root.createCaller, sessionId);
    const model = before.configOptions.find(
      (option): boolean => option.category === 'model',
    );
    if (model?.type !== 'select')
      throw new Error('Recorded catalog needs model choices.');
    const choice = model.options
      .flatMap((entry): SessionConfigSelectOption[] =>
        'groupId' in entry ? entry.options : [entry],
      )
      .find((entry): boolean => entry.value !== model.currentValue);
    if (!choice) throw new Error('Recorded catalog needs a second model.');
    const configured = await caller.session
      .setConfigOption({
        sessionId,
        configId: model.configId,
        type: 'id',
        value: choice.value,
      })
      .then(
        (
          result,
        ): {
          result: SessionSetConfigOptionOutput;
          error: undefined;
        } => ({ result, error: undefined }),
        (error: unknown): { result: undefined; error: unknown } => ({
          result: undefined,
          error,
        }),
      );
    const held = await readSnapshot(root.createCaller, sessionId);
    await caller.session.cancel({ sessionId });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    const { messageId } = await caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Use the held model' }],
    });
    await expect
      .poll(
        async (): Promise<string | null | undefined> =>
          (await caller.feed.page({ sessionId, direction: 'tail' })).rows.find(
            (row): boolean => row.id === messageId,
          )?.turnId,
      )
      .toEqual(expect.any(String));
    const rows = (await caller.feed.page({ sessionId, direction: 'tail' }))
      .rows;
    const nextTurnId = rows.find(
      (row): boolean => row.id === messageId,
    )?.turnId;
    expect(
      root.database
        .select()
        .from(turn)
        .where(eq(turn.sessionId, sessionId))
        .all(),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: nextTurnId, model: choice.value }),
      ]),
    );
    expect(configured.error).toBeUndefined();
    expect(configured.result?.configOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          configId: model.configId,
          currentValue: choice.value,
          _meta: expect.objectContaining({
            argo: expect.objectContaining({ heldUntilNextTurn: true }),
          }),
        }),
      ]),
    );
    expect(held).toMatchObject({
      configOptions: configured.result?.configOptions,
    });
    await expect
      .poll(
        async (): Promise<string | boolean | undefined> =>
          (await readSnapshot(root.createCaller, sessionId)).configOptions.find(
            (option): boolean => option.configId === model.configId,
          )?.currentValue,
      )
      .toBe(choice.value);
    await expect
      .poll(
        async (): Promise<boolean | undefined> =>
          (await readSnapshot(root.createCaller, sessionId)).configOptions.find(
            (option): boolean => option.configId === model.configId,
          )?._meta?.argo?.heldUntilNextTurn,
      )
      .not.toBe(true);
  },
);

it.each(agentAdapters)(
  'shows the applied $agent effort after the next Turn clamps a held choice',
  async (adapter): Promise<void> => {
    const root = await startNewSessionEngine(adapter, {
      recording: 'interrupt',
    });
    const caller = await root.createCaller();
    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: adapter.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Hold my choices' }],
    });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('running');
    const before = await readSnapshot(root.createCaller, sessionId);
    const model = before.configOptions.find(
      (option): boolean => option.category === 'model',
    );
    const effort = before.configOptions.find(
      (option): boolean => option.category === 'thought_level',
    );
    if (model?.type !== 'select' || effort?.type !== 'select')
      throw new Error('Recorded catalog needs model and effort choices.');
    const models = model.options.flatMap(
      (entry): SessionConfigSelectOption[] =>
        'groupId' in entry ? entry.options : [entry],
    );
    const wide = models.find(
      (entry): boolean => entry.value === model.currentValue,
    );
    const levels = wide?._meta?.argo?.supportedEffortLevels ?? [];
    const narrow = models.find(
      (entry): boolean | undefined =>
        entry._meta?.argo?.supportsEffort &&
        levels.some(
          (level): boolean =>
            !entry._meta?.argo?.supportedEffortLevels?.includes(level),
        ),
    );
    const unsupported = effort.options
      .flatMap((entry): SessionConfigSelectOption[] =>
        'groupId' in entry ? entry.options : [entry],
      )
      .find(
        (entry): boolean =>
          levels.includes(entry.value) &&
          !narrow?._meta?.argo?.supportedEffortLevels?.includes(entry.value),
      );
    if (!wide || !narrow || !unsupported)
      throw new Error('Recorded catalog needs a narrower model effort range.');
    for (const [configId, value] of [
      [model.configId, wide.value],
      [effort.configId, unsupported.value],
      [model.configId, narrow.value],
    ] as const)
      await caller.session.setConfigOption({
        sessionId,
        configId,
        type: 'id',
        value,
      });
    await caller.session.cancel({ sessionId });
    await expect
      .poll(
        async (): Promise<SessionSnapshot['state']> =>
          (await readSnapshot(root.createCaller, sessionId)).state,
      )
      .toBe('idle');
    await caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Run the narrower model' }],
    });
    await expect
      .poll(async (): Promise<boolean | undefined> => {
        const snapshot = await readSnapshot(root.createCaller, sessionId);
        return snapshot.configOptions.find(
          (option): boolean => option.configId === effort.configId,
        )?._meta?.argo?.heldUntilNextTurn;
      })
      .not.toBe(true);
    const after = await readSnapshot(root.createCaller, sessionId);
    expect(
      after.configOptions.find(
        (option): boolean => option.configId === model.configId,
      )?.currentValue,
    ).toBe(narrow.value);
    const applied = after.configOptions.find(
      (option): boolean => option.configId === effort.configId,
    )?.currentValue;
    expect(applied).not.toBe(unsupported.value);
    expect(narrow._meta?.argo?.supportedEffortLevels).toContain(applied);
    expect(
      after.configOptions.some(
        (option): boolean | undefined => option._meta?.argo?.heldUntilNextTurn,
      ),
    ).toBe(false);
  },
);

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
      firstListRejection,
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

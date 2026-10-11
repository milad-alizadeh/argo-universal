import { type AgentMessage, SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { FeedRowsJob } from '../feed';
import {
  type WriterActorRef,
  type WriterJob,
  writeJobs,
  writerMachine,
} from '../storage';
import {
  readQueuedSessionRows,
  SessionInsertJob,
  SessionRowUpdateJob,
  TurnInsertJob,
  TurnUpdateJob,
} from './session-storage';

let database: Database;
let removeDatabase: () => void;

const reply: AgentMessage = {
  sessionId: 'session-1',
  id: 'row-1',
  position: 0,
  sessionUpdate: 'agent_message',
  revision: 1,
  turnId: 'turn-1',
  state: 'open',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Complete' }],
};
const runningTurn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running' as const,
};
const sessionData = SessionRecord.omit({ createdAt: true, updatedAt: true });

const selectSession = (
  id = 'session-1',
): typeof session.$inferSelect | undefined =>
  database.select().from(session).where(eq(session.id, id)).get();
const selectTurn = (): typeof turn.$inferSelect | undefined =>
  database.select().from(turn).where(eq(turn.id, 'turn-1')).get();

const submitWrites = (
  jobs: readonly WriterJob[],
): { writer: WriterActorRef; committed: Promise<void> } => {
  const writer = createActor(writerMachine, {
    input: { database, now: () => 12000 },
  }).start();
  onTestFinished(() => {
    writer.stop();
  });
  const committed = Promise.withResolvers<void>();
  for (const [index, job] of jobs.entries())
    writer.send({
      type: 'writer.write',
      job,
      committed: index === jobs.length - 1 ? committed : undefined,
    });
  return { writer, committed: committed.promise };
};

beforeEach((): void => {
  ({ database, remove: removeDatabase } = openTestDatabase());
});

afterEach((): void => removeDatabase());

describe('commit', (): void => {
  it('inserts a Turn, then updates it', (): void => {
    writeJobs(database, [
      new TurnInsertJob({ turn: runningTurn }),
      new TurnUpdateJob({
        id: 'turn-1',
        set: { status: 'ended', stopReason: 'end_turn', endedAt: 5 },
      }),
    ]);

    expect(selectTurn()).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        status: 'ended',
        stopReason: 'end_turn',
        endedAt: 5,
      }),
    );
  });

  it('updates a session row', (): void => {
    writeJobs(database, [
      new SessionRowUpdateJob({
        id: 'session-1',
        set: { vendorSessionId: 'vendor-1', epoch: 2 },
      }),
    ]);

    expect(selectSession()).toEqual(
      expect.objectContaining({ vendorSessionId: 'vendor-1', epoch: 2 }),
    );
  });

  it('stores a new Session and remembers its checkout choice on the Project', (): void => {
    writeJobs(database, [
      new SessionInsertJob({
        checkoutChoice: { type: 'worktree' },
        session: {
          id: 'session-2',
          projectId: 'project-1',
          agent: 'mock',
          checkoutPath: '/new',
          projectionVersion: 1,
        },
      }),
    ]);

    expect(selectSession('session-2')).toMatchObject({ checkoutPath: '/new' });
    expect(
      database.$client.prepare('SELECT checkout_choice FROM project').get(),
    ).toEqual({ checkout_choice: JSON.stringify({ type: 'worktree' }) });
  });
});

it.each<[WriterJob, string]>([
  [
    new TurnInsertJob({ turn: runningTurn }),
    'insert Turn turn-1 of Session session-1',
  ],
  [
    new TurnUpdateJob({ id: 'turn-1', set: { status: 'ended' } }),
    'update Turn turn-1: status',
  ],
  [
    new SessionRowUpdateJob({
      id: 'session-1',
      set: { epoch: 1, vendorSessionId: 'vendor-1' },
    }),
    'update Session session-1: epoch, vendorSessionId',
  ],
])('names %s in the log of lost jobs as %s', (job, description): void => {
  expect(job.describe()).toBe(description);
});

it('reads a queued Session row update exactly as its commit', async (): Promise<void> => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(12000);
  onTestFinished(() => clock.mockRestore());
  const before = SessionRecord.parse(selectSession());
  const original = structuredClone(before);
  const { writer, committed } = submitWrites([
    new SessionRowUpdateJob({
      id: 'session-1',
      activityAt: 12000,
      set: {
        vendorSessionId: 'vendor-resume',
        epoch: 2,
        maxRevision: 3,
        activityAt: 999,
      },
    }),
  ]);
  const queued = readQueuedSessionRows(writer).session(before, 'session-1');
  await committed;
  expect(sessionData.parse(queued)).toEqual(sessionData.parse(selectSession()));
  expect(queued).toMatchObject({ activityAt: 12000, maxRevision: 3 });
  expect(before).toEqual(original);
});

it('reads a queued Session insert exactly as its commit', async (): Promise<void> => {
  const { writer, committed } = submitWrites([
    new SessionInsertJob({
      checkoutChoice: { type: 'main' },
      session: {
        id: 'session-2',
        projectId: 'project-1',
        agent: 'mock',
        checkoutPath: '/new',
        projectionVersion: 1,
        title: 'New Session',
      },
    }),
  ]);
  const queued = readQueuedSessionRows(writer).session(undefined, 'session-2');
  await committed;
  expect(sessionData.parse(queued)).toEqual(
    sessionData.parse(selectSession('session-2')),
  );
});

it('reads a queued Turn insert exactly as its commit', async (): Promise<void> => {
  const { writer, committed } = submitWrites([
    new TurnInsertJob({ turn: { ...runningTurn, startedAt: 12000 } }),
  ]);
  const queued = readQueuedSessionRows(writer).turns([]);
  await committed;
  expect(queued).toEqual([Turn.parse(selectTurn())]);
});

it('reads a queued Turn update exactly as its commit', async (): Promise<void> => {
  database
    .insert(turn)
    .values({ ...runningTurn, startedAt: 100 })
    .run();
  const before = Turn.parse(selectTurn());
  const original = structuredClone(before);
  const { writer, committed } = submitWrites([
    new TurnUpdateJob({
      id: 'turn-1',
      set: {
        status: 'ended',
        stopReason: 'error',
        endedAt: 200,
        error: { code: 'interrupted', message: 'Stopped' },
      },
    }),
  ]);
  const queued = readQueuedSessionRows(writer).turns([before]);
  await committed;
  expect(queued).toEqual([Turn.parse(selectTurn())]);
  expect(before).toEqual(original);
});

it('reads the Session revision of queued Feed rows exactly as their commit', async (): Promise<void> => {
  const before = SessionRecord.parse(selectSession());
  const { writer, committed } = submitWrites([
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [reply],
      maxRevision: 1,
      activityAt: 100,
    }),
  ]);
  const queued = readQueuedSessionRows(writer).session(before, 'session-1');
  await committed;
  expect(sessionData.parse(queued)).toEqual(sessionData.parse(selectSession()));
});

it.each([
  {
    kind: 'Feed rows',
    job: new FeedRowsJob({ sessionId: 'session-1', rows: [], maxRevision: 2 }),
    expected: { activityAt: 12000, startedAt: null },
  },
  {
    kind: 'Session revision',
    job: new SessionRowUpdateJob({ id: 'session-1', set: { maxRevision: 2 } }),
    expected: { activityAt: 12000, startedAt: null },
  },
  {
    kind: 'Turn insert',
    job: new TurnInsertJob({ turn: runningTurn }),
    expected: { activityAt: 0, startedAt: 12000 },
  },
  {
    kind: 'supplied Feed stamp',
    job: new FeedRowsJob({
      sessionId: 'session-1',
      rows: [],
      maxRevision: 2,
      activityAt: 100,
    }),
    expected: { activityAt: 100, startedAt: null },
  },
  {
    kind: 'supplied Session stamp',
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { maxRevision: 2 },
      activityAt: 200,
    }),
    expected: { activityAt: 200, startedAt: null },
  },
  {
    kind: 'supplied Turn stamp',
    job: new TurnInsertJob({ turn: { ...runningTurn, startedAt: 300 } }),
    expected: { activityAt: 0, startedAt: 300 },
  },
])(
  'keeps $kind times equal across repeated reads and commit',
  async ({ job, expected }): Promise<void> => {
    const before = SessionRecord.parse(selectSession());
    const { writer, committed } = submitWrites([job]);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(20000);
    onTestFinished(() => clock.mockRestore());
    const readTimes = (): typeof expected => ({
      activityAt:
        readQueuedSessionRows(writer).session(before, 'session-1')
          ?.activityAt ?? 0,
      startedAt: readQueuedSessionRows(writer).turns([])[0]?.startedAt ?? null,
    });
    expect(readTimes()).toEqual(expected);
    clock.mockReturnValue(30000);
    expect(readTimes()).toEqual(expected);
    await committed;
    expect({
      activityAt: selectSession()?.activityAt,
      startedAt: selectTurn()?.startedAt ?? null,
    }).toEqual(expected);
  },
);

import { SessionRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { FeedRowsJob } from '../../feed';
import {
  type WriterActorRef,
  type WriterJob,
  writerMachine,
} from '../../storage';
import { readQueuedSessionRows, SessionRowUpdateJob, TurnInsertJob } from '.';

let database: Database;

let removeDatabase: () => void;

const runningTurn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running' as const,
};

const selectSession = (
  id = 'session-1',
): typeof session.$inferSelect | undefined =>
  database.select().from(session).where(eq(session.id, id)).get();

const selectTurn = (): typeof turn.$inferSelect | undefined =>
  database.select().from(turn).where(eq(turn.id, 'turn-1')).get();

const committedTurn = (): number | null => selectTurn()?.startedAt ?? null;

interface SubmittedWrites {
  writer: WriterActorRef;
  committed: Promise<void>;
}

const submitWrites = (jobs: readonly WriterJob[]): SubmittedWrites => {
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

    const readActivity = (): number =>
      readQueuedSessionRows(writer).session(before, 'session-1')?.activityAt ??
      0;

    const readTurn = (): number | null =>
      readQueuedSessionRows(writer).turns([])[0]?.startedAt ?? null;

    const readTimes = (): typeof expected => ({
      activityAt: readActivity(),
      startedAt: readTurn(),
    });

    expect(readTimes()).toEqual(expected);
    clock.mockReturnValue(30000);
    expect(readTimes()).toEqual(expected);
    await committed;
    expect({
      activityAt: selectSession()?.activityAt,
      startedAt: committedTurn(),
    }).toEqual(expected);
  },
);

import { Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import {
  type WriterActorRef,
  type WriterJob,
  writerMachine,
} from '../../storage';
import { readQueuedSessionRows, TurnInsertJob, TurnUpdateJob } from '.';

let database: Database;

let removeDatabase: () => void;

const runningTurn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running' as const,
};

const selectTurn = (): typeof turn.$inferSelect | undefined =>
  database.select().from(turn).where(eq(turn.id, 'turn-1')).get();

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

it('reads a queued Turn insert exactly as its commit', async (): Promise<void> => {
  const { writer, committed } = submitWrites([
    new TurnInsertJob({ turn: { ...runningTurn, startedAt: 12000 } }),
  ]);

  const queued = readQueuedSessionRows(writer);
  expect(queued.turnSessionId('turn-1')).toBe('session-1');
  const turns = queued.turns([]);
  await committed;
  expect(turns).toEqual([Turn.parse(selectTurn())]);
});

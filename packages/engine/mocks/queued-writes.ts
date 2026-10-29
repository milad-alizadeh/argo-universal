import type { Database } from '@repo/db';
import { session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import {
  type WriterActorRef,
  type WriterJob,
  writerMachine,
} from '../src/storage';
import { openTestDatabase } from './database';

// A Writer test file imports this for a fresh test database per test: `project-1` and its Session `session-1`.
let opened: ReturnType<typeof openTestDatabase> | undefined;

beforeEach((): void => {
  opened = openTestDatabase();
});

afterEach((): void => {
  opened?.remove();
  opened = undefined;
});

export const testDatabase = (): Database =>
  opened?.database ?? expect.unreachable('the test database is not open');

export const runningTurn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running' as const,
};

export type SubmittedWrites = {
  writer: WriterActorRef;
  committed: Promise<void>;
};

// A Writer over the test database whose clock reads 12000; it stops when the test ends.
export function startTestWriter(): WriterActorRef {
  const writer = createActor(writerMachine, {
    input: { database: testDatabase(), now: () => 12000 },
  }).start();

  onTestFinished(() => {
    writer.stop();
  });

  return writer;
}

// Queues the jobs in order on a new test Writer; `committed` settles when the last one commits.
export const submitWrites = (jobs: readonly WriterJob[]): SubmittedWrites =>
  queueWrites(startTestWriter(), jobs);

// Queues the jobs in order on this Writer; `committed` settles when the last one commits.
export function queueWrites(
  writer: WriterActorRef,
  jobs: readonly WriterJob[],
): SubmittedWrites {
  const committed = Promise.withResolvers<void>();

  for (const [index, job] of jobs.entries())
    writer.send({
      type: 'writer.write',
      job,
      committed: index === jobs.length - 1 ? committed : undefined,
    });

  return { writer, committed: committed.promise };
}

export const selectSession = (
  id = 'session-1',
): typeof session.$inferSelect | undefined =>
  testDatabase().select().from(session).where(eq(session.id, id)).get();

export const selectTurn = (): typeof turn.$inferSelect | undefined =>
  testDatabase().select().from(turn).where(eq(turn.id, 'turn-1')).get();

import { type AgentMessage, SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { FeedRowsJob } from '../../feed';
import {
  type WriterActorRef,
  type WriterJob,
  writerMachine,
} from '../../storage';
import {
  readQueuedSessionRows,
  TurnUpdateJob,
} from '../session-storage/session-storage';

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

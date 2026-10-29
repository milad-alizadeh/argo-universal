import { type AgentMessage, SessionRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
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
import {
  readQueuedSessionRows,
  SessionInsertJob,
  SessionRowUpdateJob,
} from '.';

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

const sessionData = SessionRecord.omit({ createdAt: true, updatedAt: true });

const selectSession = (
  id = 'session-1',
): typeof session.$inferSelect | undefined =>
  database.select().from(session).where(eq(session.id, id)).get();

type SubmittedWrites = { writer: WriterActorRef; committed: Promise<void> };

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

it('reads a queued job of any module through its own Session projection', (): void => {
  const before = SessionRecord.parse(selectSession());

  const { writer } = submitWrites([
    {
      describe: (): string => 'pin Session session-1',
      commit: (): void => undefined,
      session: (current, sessionId): SessionRecord | undefined =>
        current && sessionId === 'session-1'
          ? { ...current, title: 'Pinned' }
          : current,
    },
  ]);

  expect(readQueuedSessionRows(writer).session(before, 'session-1')).toEqual({
    ...before,
    title: 'Pinned',
  });
});

import type { AgentMessage, SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob, blobRef, feedRow, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it, onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { writeJobs, writerMachine } from '../storage';
import { hydrateStoredFeedRow, storedFeedColumns } from './feed-row';
import { FeedRowsJob, readQueuedFeed } from './feed-storage';

let database: Database;
let removeDatabase: () => void;

const row = (overrides: Partial<AgentMessage> = {}): AgentMessage => ({
  sessionId: 'session-1',
  id: 'row-1',
  position: 0,
  sessionUpdate: 'agent_message',
  revision: 1,
  turnId: 'turn-1',
  state: 'open',
  messageId: 'message-1',
  content: [],
  ...overrides,
});
const feedRows = (
  rows: SessionUpdate[],
  maxRevision: number,
  extra: { activityAt?: number; blobIds?: string[] } = {},
): FeedRowsJob =>
  new FeedRowsJob({ sessionId: 'session-1', rows, maxRevision, ...extra });

const selectRows = (): (typeof feedRow.$inferSelect)[] =>
  database
    .select()
    .from(feedRow)
    .where(eq(feedRow.sessionId, 'session-1'))
    .orderBy(feedRow.position)
    .all();
const selectSession = (): typeof session.$inferSelect | undefined =>
  database.select().from(session).where(eq(session.id, 'session-1')).get();

beforeEach((): void => {
  ({ database, remove: removeDatabase } = openTestDatabase());
});

afterEach((): void => removeDatabase());

it('inserts Feed rows and sets the Session maxRevision', (): void => {
  writeJobs(database, [
    feedRows([row(), row({ id: 'row-2', position: 1, revision: 2 })], 2),
  ]);

  expect(selectRows()).toEqual([
    expect.objectContaining({
      sessionId: 'session-1',
      id: 'row-1',
      position: 0,
    }),
    expect.objectContaining({
      sessionId: 'session-1',
      id: 'row-2',
      position: 1,
    }),
  ]);
  expect(selectSession()?.maxRevision).toBe(2);
});

it('stamps activity when revisions advance and preserves it for repeated or older batches', (): void => {
  writeJobs(database, [feedRows([row()], 1, { activityAt: 100 })]);
  expect(selectSession()).toMatchObject({ maxRevision: 1, activityAt: 100 });
  writeJobs(database, [feedRows([], 1, { activityAt: 200 })]);
  writeJobs(database, [feedRows([], 0, { activityAt: 300 })]);
  expect(selectSession()).toMatchObject({ maxRevision: 1, activityAt: 100 });
  writeJobs(database, [feedRows([], 2, { activityAt: 400 })]);
  expect(selectSession()).toMatchObject({ maxRevision: 2, activityAt: 400 });
});

it('updates a Feed row it wrote before, by id, and keeps its position', (): void => {
  writeJobs(database, [feedRows([row()], 1)]);
  database
    .update(feedRow)
    .set({ sourceRef: { line: 4 }, searchText: 'Older' })
    .run();
  writeJobs(database, [
    feedRows(
      [
        row({
          position: 7,
          revision: 3,
          state: 'settled',
          content: [{ type: 'text', text: 'done' }],
        }),
      ],
      3,
    ),
  ]);

  expect(selectRows()).toEqual([
    expect.objectContaining({
      id: 'row-1',
      position: 0,
      revision: 3,
      state: 'settled',
      payload: {
        messageId: 'message-1',
        content: [{ type: 'text', text: 'done' }],
      },
      payloadVersion: 1,
      sourceRef: null,
      searchText: null,
    }),
  ]);
  expect(selectSession()?.maxRevision).toBe(3);
});

it('records the blobs a job names that are stored, once per Session', (): void => {
  database
    .insert(blob)
    .values({ id: 'image-1', mime: 'image/png', bytes: 3 })
    .run();
  const prompt = [
    { ...row({ state: 'settled' }), sessionUpdate: 'user_message' as const },
  ];
  const blobIds = ['image-1', 'no-such-blob'];

  writeJobs(database, [
    feedRows(prompt, 1, { blobIds }),
    feedRows(prompt, 2, { blobIds }),
  ]);

  expect(database.select().from(blobRef).all()).toEqual([
    { blobId: 'image-1', sessionId: 'session-1' },
  ]);
});

it('names its rows, Session and maxRevision in the log of lost jobs', (): void => {
  expect(feedRows([row(), row({ id: 'row-2' })], 2).describe()).toBe(
    'Feed rows row-1, row-2 of Session session-1 at maxRevision 2',
  );
});

it('reads queued Feed rows exactly as their commit', async (): Promise<void> => {
  const writer = createActor(writerMachine, {
    input: { database, now: () => 12000 },
  }).start();
  onTestFinished(() => {
    writer.stop();
  });
  const committed = Promise.withResolvers<void>();
  writer.send({
    type: 'writer.write',
    job: feedRows([row({ content: [{ type: 'text', text: 'Complete' }] })], 1),
    committed,
  });

  const queued = readQueuedFeed(writer, 'session-1');
  await committed.promise;

  expect(queued).toEqual({
    rows: database
      .select(storedFeedColumns)
      .from(feedRow)
      .all()
      .map((stored): SessionUpdate =>
        hydrateStoredFeedRow('session-1', stored),
      ),
    maxRevision: 1,
    highestPosition: 0,
  });
});

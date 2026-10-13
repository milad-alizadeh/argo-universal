import { expect, it, onTestFinished, vi } from 'vitest';
import { storedMessage as message } from '#mocks/feed';
import {
  upsertRowEvent,
  fifthMessageRowId,
  dropFeedWriteTrigger,
  createOpenMessageChange,
} from '#mocks/feed-inputs';
import { takeFeedChanges } from '#mocks/feed-observations';
import {
  database,
  startFeedTestHost,
  createFeedRouterCaller,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';
it('catches up with rows the database writer still holds', async (): Promise<void> => {
  await startFeedTestHost();
  database.$client
    .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
  onTestFinished((): void => {
    database.$client.exec('DROP TRIGGER IF EXISTS hold_feed_writes');
  });
  applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
  applyFeedChange({
    type: 'patch',
    id: fifthMessageRowId,
    set: { state: 'settled' },
  });
  await vi.advanceTimersByTimeAsync(0);

  const updates = await subscribe({ epoch: 3, revision: 5 });

  expect(await takeFeedChanges(updates, 1)).toEqual([
    {
      type: upsertRowEvent,
      rev: 7,
      row: expect.objectContaining({
        id: fifthMessageRowId,
        state: 'settled',
      }),
    },
  ]);
});

it('reads a canonical queued row before its transaction retries', async (): Promise<void> => {
  await startFeedTestHost();
  database.$client
    .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
  const { id, state, sessionUpdate, messageId, content } = message(5, 6);
  applyFeedChange({
    type: 'upsert',
    update: { id, state, sessionUpdate, messageId, content },
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(
    await createFeedRouterCaller().feed.row({
      sessionId: 'session-1',
      id: fifthMessageRowId,
    }),
  ).toEqual({ ...message(5, 6), turnId: null });
  database.$client.exec(dropFeedWriteTrigger);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    rows: [{ ...message(5, 6), turnId: null }],
    maxRevision: 6,
  });
});

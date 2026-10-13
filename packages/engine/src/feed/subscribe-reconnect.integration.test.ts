import { expect, it, vi } from 'vitest';
import {
  upsertRowEvent,
  fifthMessageRowId,
  fourthStoredUpsert,
  dropFeedWriteTrigger,
  createOpenMessageChange,
} from '#mocks/feed-inputs';
import {
  takeFeedChanges,
  summarizeFeedChanges,
} from '#mocks/feed-observations';
import {
  database,
  startFeedTestHost,
  createFeedRouterCaller,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';
it('reconnects across stored, queued and live revisions before retry commits', async (): Promise<void> => {
  await startFeedTestHost();
  database.$client
    .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
  applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Queued'));
  applyFeedChange({
    type: 'patch',
    id: fifthMessageRowId,
    set: { state: 'settled' },
  });
  await vi.advanceTimersByTimeAsync(0);
  const updates = await subscribe({ epoch: 3, revision: 4 });
  expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
    fourthStoredUpsert,
    'upsert message-5#0 @7',
  ]);
  applyFeedChange({
    type: 'patch',
    id: fifthMessageRowId,
    set: { content: [{ type: 'text', text: 'Newest' }] },
  });
  await vi.advanceTimersByTimeAsync(60);
  expect(await takeFeedChanges(updates, 1)).toEqual([
    {
      type: 'row.patch',
      id: fifthMessageRowId,
      rev: 8,
      set: { content: [{ type: 'text', text: 'Newest' }] },
    },
  ]);
  const reconnected = await subscribe({ epoch: 3, revision: 5 });
  expect(await takeFeedChanges(reconnected, 1)).toEqual([
    {
      type: upsertRowEvent,
      rev: 8,
      row: expect.objectContaining({
        id: fifthMessageRowId,
        position: 5,
        content: [{ type: 'text', text: 'Newest' }],
      }),
    },
  ]);
  database.$client.exec(dropFeedWriteTrigger);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    maxRevision: 8,
    rows: [
      {
        id: fifthMessageRowId,
        position: 5,
        revision: 8,
        content: [{ type: 'text', text: 'Newest' }],
      },
    ],
  });
});

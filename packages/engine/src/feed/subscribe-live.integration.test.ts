import { expect, it, vi } from 'vitest';
import {
  fifthMessageRowId,
  fourthStoredUpsert,
  createOpenMessageChange,
  createTextAppendChange,
} from '#mocks/feed-inputs';
import {
  takeFeedChanges,
  summarizeFeedChanges,
} from '#mocks/feed-observations';
import {
  startFeedTestHost,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';
it('with no sync point, sends the rows not yet stored, then live changes', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hel'));
  const updates = await subscribe(null);

  expect(summarizeFeedChanges(await takeFeedChanges(updates, 1))).toEqual([
    'upsert message-5#0 @6',
  ]);

  applyFeedChange(createTextAppendChange(fifthMessageRowId, 'lo'));
  applyFeedChange(createOpenMessageChange('message-6#0'));
  await vi.advanceTimersByTimeAsync(60);
  expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
    'append message-5#0 +lo at 3 @7',
    'upsert message-6#0 @8',
  ]);
});

it('catches up from a revision with stored rows and rows not yet written, without repeats', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange(createOpenMessageChange(fifthMessageRowId));
  applyFeedChange(createTextAppendChange(fifthMessageRowId, 'Hel'));
  const updates = await subscribe({ epoch: 3, revision: 4 });

  expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
    fourthStoredUpsert,
    'upsert message-5#0 @7',
  ]);

  applyFeedChange(createTextAppendChange(fifthMessageRowId, 'lo'));
  await vi.advanceTimersByTimeAsync(60);
  expect(summarizeFeedChanges(await takeFeedChanges(updates, 1))).toEqual([
    'append message-5#0 +lo at 3 @8',
  ]);
});

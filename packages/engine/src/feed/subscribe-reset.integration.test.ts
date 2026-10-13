import { expect, it } from 'vitest';
import { fifthMessageRowId, createOpenMessageChange } from '#mocks/feed-inputs';
import {
  takeFeedChanges,
  summarizeFeedChanges,
} from '#mocks/feed-observations';
import {
  startFeedTestHost,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';
it('resets a subscriber from another epoch, then sends the rows not yet stored', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange(createOpenMessageChange(fifthMessageRowId));
  const updates = await subscribe({ epoch: 2, revision: 9 });

  expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
    'reset',
    'upsert message-5#0 @6',
  ]);
});

it('fails with NOT_FOUND for an unknown Session', async (): Promise<void> => {
  await startFeedTestHost();
  const updates = await subscribe(null, 'session-9');

  await expect(updates.next()).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

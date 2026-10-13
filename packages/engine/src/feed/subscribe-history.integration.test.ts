import { expect, it, vi } from 'vitest';
import { countDatabaseReads } from '#mocks/database';
import { createOpenMessageChange } from '#mocks/feed-inputs';
import {
  takeFeedChanges,
  summarizeFeedChanges,
} from '#mocks/feed-observations';
import {
  feedTestHost,
  startFeedTestHost,
  applyFeedChange,
  subscribe,
  longHistoryRows,
  longHistoryPositions,
  storeLongHistory,
} from '#mocks/feed-suite';
it('catches up more rows than one page once each, in revision order, before live changes', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 0 });

  const caughtUp = await takeFeedChanges(updates, longHistoryRows);
  applyFeedChange(createOpenMessageChange('live-row'));
  await vi.advanceTimersByTimeAsync(60);

  expect(
    summarizeFeedChanges([...caughtUp, ...(await takeFeedChanges(updates, 1))]),
  ).toEqual([
    ...longHistoryPositions.map(
      (position): string => `upsert message-${position}#0 @${position + 1}`,
    ),
    `upsert live-row @${longHistoryRows + 1}`,
  ]);
});

it('reads a long catch-up from storage one page at a time', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const counted = countDatabaseReads(feedTestHost.database);
  const updates = await subscribe({ epoch: 3, revision: 0 });

  await takeFeedChanges(updates, longHistoryRows);

  expect(counted.metrics.largestRead).toBeLessThanOrEqual(200);
});

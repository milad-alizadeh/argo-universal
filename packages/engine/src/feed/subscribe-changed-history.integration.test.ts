import { expect, it, vi } from 'vitest';
import {
  takeFeedChanges,
  summarizeFeedChanges,
} from '#mocks/feed-observations';
import {
  database,
  startFeedTestHost,
  applyFeedChange,
  subscribe,
  longHistoryRows,
  longHistoryPositions,
  storeLongHistory,
} from '#mocks/feed-suite';
it.each([
  { copy: 'stored', holdWrites: false },
  { copy: 'queued', holdWrites: true },
])(
  'sends a row that changed between catch-up pages once, whole, at its newest $copy revision',
  async ({ holdWrites }): Promise<void> => {
    storeLongHistory();
    await startFeedTestHost();
    if (holdWrites)
      database.$client
        .exec(`CREATE TRIGGER hold_feed_writes BEFORE UPDATE ON feed_row
        BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    const updates = await subscribe({ epoch: 3, revision: 0 });
    const firstPage = await takeFeedChanges(updates, 200);
    applyFeedChange({
      type: 'patch',
      id: 'message-300#0',
      set: { content: [{ type: 'text', text: 'Changed' }] },
    });
    await vi.advanceTimersByTimeAsync(60);

    const rest = await takeFeedChanges(updates, longHistoryRows - 200);

    expect({
      revisions: summarizeFeedChanges([...firstPage, ...rest]),
      changed: rest.at(-1),
    }).toEqual({
      revisions: [
        ...longHistoryPositions
          .filter((position): boolean => position !== 300)
          .map(
            (position): string =>
              `upsert message-${position}#0 @${position + 1}`,
          ),
        `upsert message-300#0 @${longHistoryRows + 1}`,
      ],
      changed: expect.objectContaining({
        row: expect.objectContaining({
          position: 300,
          content: [{ type: 'text', text: 'Changed' }],
        }),
      }),
    });
  },
);

import { describe, expect, it } from 'vitest';
import { page, streamed } from '../../../../mocks/feed-state.mocks';
import { emptyFeed, mergeNewestPage, mergeOlderPage } from './feed-state';

describe('mergeOlderPage', () => {
  it('ignores a page from another epoch', () => {
    const feed = mergeNewestPage(
      emptyFeed,
      page(streamed.rows, 9, { limit: 1 }),
    );

    const older = {
      ...page(streamed.rows, 9, { before: feed.startCursor ?? 0 }),
      epoch: 4,
    };

    expect(mergeOlderPage(feed, older)).toBe(feed);
  });

  it('starts over from a tail the Server sent for a stale cursor', () => {
    const feed = mergeNewestPage(
      emptyFeed,
      page(streamed.rows, 9, { limit: 1 }),
    );

    const tail = { ...page(streamed.rows, 12), epoch: 2, staleCursor: true };
    expect(mergeOlderPage(feed, tail)).toEqual(
      mergeNewestPage(emptyFeed, tail),
    );
  });
});

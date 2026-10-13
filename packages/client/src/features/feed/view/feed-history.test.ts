import type { FeedPageOutput } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { expect, it } from 'vitest';
import { mergeHistoryPages, needsOlderHistory } from './feed-history';
import {
  applySubscriptionEvent,
  emptyFeed,
  mergeNewestPage,
} from './feed-state';

const row = recordedFeedMocks[0]?.rows[0];
if (!row) throw new Error('Recorded Feed needs a row');
const oldest = { ...row, id: 'oldest', position: 0, revision: 1 };
const newest = { ...row, id: 'newest', position: 1, revision: 2 };
const tail: FeedPageOutput = {
  epoch: 1,
  maxRevision: 2,
  rows: [newest],
  hasOlder: true,
  startCursor: 1,
  staleCursor: false,
};
const older: FeedPageOutput = {
  ...tail,
  rows: [oldest],
  hasOlder: false,
  startCursor: 0,
};

it('merges history without replacing a newer streamed row', () => {
  const liveRow = { ...newest, revision: 3, state: 'open' as const };
  const feed = applySubscriptionEvent(mergeNewestPage(emptyFeed, tail), {
    type: 'row.upsert',
    rev: 3,
    row: liveRow,
  }).feed;
  expect(mergeHistoryPages(feed, [tail, older])).toMatchObject({
    rows: [oldest, liveRow],
    revision: 3,
    hasOlder: false,
    startCursor: 0,
  });
});

it('ignores history that finishes after a reset to a newer epoch', () => {
  const reset = applySubscriptionEvent(mergeNewestPage(emptyFeed, tail), {
    type: 'reset',
    epoch: 2,
  }).feed;
  expect(mergeHistoryPages(reset, [tail, older])).toBe(reset);
});

it('discards earlier pages when a stale cursor returns a new epoch', () => {
  const replacement = { ...oldest, id: 'rebuilt', revision: 1 };
  const rebuilt = {
    ...older,
    epoch: 2,
    maxRevision: 1,
    rows: [replacement],
    staleCursor: true,
  };
  expect(
    mergeHistoryPages(mergeNewestPage(emptyFeed, tail), [tail, rebuilt]),
  ).toEqual({
    epoch: 2,
    revision: 1,
    rows: [replacement],
    hasOlder: false,
    startCursor: 0,
  });
});

it('does not skip live changes when an older page has a later stored revision', () => {
  expect(
    mergeHistoryPages(mergeNewestPage(emptyFeed, tail), [
      tail,
      { ...older, maxRevision: 10 },
    ]).revision,
  ).toBe(2);
});

it('keeps older history available when live rows arrive before the reset tail', () => {
  const live = applySubscriptionEvent(
    { ...emptyFeed, epoch: 1 },
    {
      type: 'row.upsert',
      rev: 3,
      row: { ...newest, revision: 3 },
    },
  ).feed;
  expect(mergeHistoryPages(live, [tail]).hasOlder).toBe(true);
});

it.each([
  { cursor: 10, epoch: 1, hasOlder: true, needed: true },
  { cursor: 5, epoch: 1, hasOlder: true, needed: true },
  { cursor: 4, epoch: 1, hasOlder: true, needed: false },
  { cursor: 5, epoch: 1, hasOlder: false, needed: false },
  { cursor: 10, epoch: 2, hasOlder: true, needed: false },
])(
  'continues past overlapping history at $cursor in epoch $epoch with hasOlder=$hasOlder',
  ({ cursor, epoch, hasOlder, needed }) => {
    expect(
      needsOlderHistory(
        { startCursor: cursor, epoch, hasOlder },
        { startCursor: 5, epoch: 1 },
      ),
    ).toBe(needed);
  },
);

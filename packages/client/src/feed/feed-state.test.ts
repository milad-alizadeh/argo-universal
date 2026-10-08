import { recordedFeedMocks } from '@repo/api/mocks';
import type { FeedPageOutput, FeedSubscribeOutput } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  applySubscriptionEvent,
  emptyFeed,
  type FeedState,
  mergeNewestPage,
  mergeOlderPage,
} from './feed-state';

type RowEvent = Exclude<FeedSubscribeOutput, { type: 'snapshot' | 'closed' }>;

// What `feed.page` answers for a recorded Feed, as the Server pages it.
function page(
  rows: FeedState['rows'],
  maxRevision: number,
  { before, limit = 40 }: { before?: number; limit?: number } = {},
): FeedPageOutput {
  const window = rows.filter(
    (row) => before === undefined || row.position < before,
  );
  const slice = window.slice(-limit);
  return {
    epoch: 0,
    maxRevision,
    rows: slice,
    hasOlder: slice.length < window.length,
    startCursor: slice[0]?.position ?? null,
    staleCursor: false,
  };
}

const rowEvents = (stream: readonly FeedSubscribeOutput[]): RowEvent[] =>
  stream.filter(
    (event): event is RowEvent =>
      event.type !== 'snapshot' && event.type !== 'closed',
  );

function replay(state: FeedState, events: readonly RowEvent[]): FeedState {
  return events.reduce((current, event) => {
    const result = applySubscriptionEvent(current, event);
    expect(result.missingRowId).toBeUndefined();
    return result.feed;
  }, state);
}

describe.each(recordedFeedMocks)('$agent $recording', (mock) => {
  it('builds the recorded rows from the live stream alone', () => {
    const feed = replay(
      mergeNewestPage(emptyFeed, page([], 0)),
      rowEvents(mock.stream),
    );
    expect(feed.rows).toEqual(mock.rows);
    expect(feed.revision).toBe(mock.snapshot.maxRevision);
  });

  it('pages every older row in before the newest, oldest first', () => {
    let feed = mergeNewestPage(
      emptyFeed,
      page(mock.rows, mock.snapshot.maxRevision, { limit: 1 }),
    );
    while (feed.hasOlder && feed.startCursor !== null)
      feed = mergeOlderPage(
        feed,
        page(mock.rows, mock.snapshot.maxRevision, {
          before: feed.startCursor,
          limit: 1,
        }),
      );
    expect(feed.rows).toEqual(mock.rows);
    expect(feed.hasOlder).toBe(false);
  });
});

const streamed = recordedFeedMocks.find(
  (mock) => mock.agent === 'agent-2' && mock.recording === 'markdown-answer',
);
if (!streamed) throw new Error('No streamed recording');
const firstAppend = streamed.stream.findIndex(
  (event) => event.type === 'row.append',
);
const beforeAppend = replay(
  mergeNewestPage(emptyFeed, page([], 0)),
  rowEvents(streamed.stream.slice(0, firstAppend)),
);
const append = streamed.stream[firstAppend];
if (append?.type !== 'row.append')
  throw new Error('No append in streamed recording');

describe('applySubscriptionEvent', () => {
  it('asks for the whole row when an append does not start where its text ends', () => {
    const result = applySubscriptionEvent(beforeAppend, {
      ...append,
      off: append.off + 1,
    });
    expect(result.missingRowId).toBe(append.id);
    expect(result.feed.rows).toBe(beforeAppend.rows);
  });

  it('asks for the whole row when an append or a patch names a row it lacks', () => {
    expect(
      applySubscriptionEvent(beforeAppend, { ...append, id: 'missing' })
        .missingRowId,
    ).toBe('missing');
    expect(
      applySubscriptionEvent(beforeAppend, {
        type: 'row.patch',
        rev: append.rev,
        id: 'missing',
        set: { state: 'settled' },
      }).missingRowId,
    ).toBe('missing');
  });

  it('keeps a newer row when an older revision of it arrives', () => {
    const [row] = streamed.rows;
    if (!row) throw new Error('No row');
    const feed = mergeNewestPage(emptyFeed, page(streamed.rows, 9));
    const stale = applySubscriptionEvent(feed, {
      type: 'row.upsert',
      rev: row.revision - 1,
      row: { ...row, revision: row.revision - 1, state: 'open' },
    });
    expect(stale.feed.rows[0]).toBe(row);
  });

  it('leaves a row older than the paged window to paging', () => {
    const feed = mergeNewestPage(
      emptyFeed,
      page(streamed.rows, streamed.snapshot.maxRevision, { limit: 1 }),
    );
    const [oldest] = streamed.rows;
    if (!oldest) throw new Error('No row');
    const result = applySubscriptionEvent(feed, {
      type: 'row.upsert',
      rev: streamed.snapshot.maxRevision + 1,
      row: { ...oldest, revision: streamed.snapshot.maxRevision + 1 },
    });
    expect(result.feed.rows).toEqual(feed.rows);
    expect(result.feed.revision).toBe(streamed.snapshot.maxRevision + 1);
  });

  it('drops every row on a reset and waits for a new tail', () => {
    const result = applySubscriptionEvent(
      mergeNewestPage(emptyFeed, page(streamed.rows, 9)),
      { type: 'reset', epoch: 1 },
    );
    expect(result.feed).toEqual({ ...emptyFeed, epoch: 1 });
    expect(result.reset).toBe(true);
  });
});

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

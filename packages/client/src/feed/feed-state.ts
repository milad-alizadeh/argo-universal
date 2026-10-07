import {
  type FeedPageOutput,
  type FeedSubscribeOutput,
  readFeedField,
  type SessionUpdate,
  writeFeedField,
} from '@repo/contracts';

// The rows an App holds for one Session: a window of the newest rows, kept in sync by revision (ADR 0007).
export interface FeedState {
  // Null until the first page arrives.
  epoch: number | null;
  // The newest revision applied, the sync point for `feed.subscribe`.
  revision: number;
  // Oldest first, by position.
  rows: readonly SessionUpdate[];
  hasOlder: boolean;
  // The oldest held row's position, the next `before` cursor.
  startCursor: number | null;
}

export const emptyFeed: FeedState = {
  epoch: null,
  revision: 0,
  rows: [],
  hasOlder: false,
  startCursor: null,
};

export interface SubscriptionEventResult {
  feed: FeedState;
  // A row the event could not be applied to; the App fetches it whole with `feed.row`.
  missingRowId?: string;
  // The Server rebuilt the Feed; the App pages the tail again.
  reset?: true;
}

const byPosition = (first: SessionUpdate, second: SessionUpdate) =>
  first.position - second.position;

// Keeps the newer revision of each row, ordered by position.
function keepNewerRevisions(
  held: readonly SessionUpdate[],
  incoming: readonly SessionUpdate[],
): readonly SessionUpdate[] {
  const byId = new Map(held.map((row) => [row.id, row]));
  let changed = false;
  for (const row of incoming) {
    const known = byId.get(row.id);
    if (known && known.revision >= row.revision) continue;
    byId.set(row.id, row);
    changed = true;
  }
  return changed ? [...byId.values()].sort(byPosition) : held;
}

// The newest rows; a page from a new epoch replaces everything held.
export function mergeNewestPage(
  feed: FeedState,
  page: FeedPageOutput,
): FeedState {
  const newEpoch = feed.epoch !== page.epoch;
  const rows = keepNewerRevisions(newEpoch ? [] : feed.rows, page.rows);
  return {
    epoch: page.epoch,
    revision: newEpoch
      ? page.maxRevision
      : Math.max(feed.revision, page.maxRevision),
    rows,
    hasOlder:
      newEpoch || feed.rows.length === 0 ? page.hasOlder : feed.hasOlder,
    startCursor: rows[0]?.position ?? null,
  };
}

// Rows before the window; a stale cursor brings the tail of a new epoch instead.
export function mergeOlderPage(
  feed: FeedState,
  page: FeedPageOutput,
): FeedState {
  if (page.staleCursor) return mergeNewestPage(emptyFeed, page);
  if (page.epoch !== feed.epoch) return feed;
  const rows = keepNewerRevisions(feed.rows, page.rows);
  return {
    ...feed,
    rows,
    hasOlder: page.hasOlder,
    startCursor: rows[0]?.position ?? null,
  };
}

// Swaps in a held row's new revision.
function replaceHeldRow(feed: FeedState, revised: SessionUpdate): FeedState {
  return {
    ...feed,
    revision: Math.max(feed.revision, revised.revision),
    rows: feed.rows.map((held) => (held.id === revised.id ? revised : held)),
  };
}

// Applies one `feed.subscribe` row event to the held window.
export function applySubscriptionEvent(
  feed: FeedState,
  event: Exclude<FeedSubscribeOutput, { type: 'snapshot' }>,
): SubscriptionEventResult {
  if (event.type === 'reset')
    return { feed: { ...emptyFeed, epoch: event.epoch }, reset: true };
  const revision = Math.max(feed.revision, event.rev);
  if (event.type === 'row.upsert') {
    // A row older than the window arrives with its page.
    const beforeWindow =
      feed.hasOlder &&
      feed.startCursor !== null &&
      event.row.position < feed.startCursor;
    return {
      feed: {
        ...feed,
        revision,
        rows: beforeWindow
          ? feed.rows
          : keepNewerRevisions(feed.rows, [event.row]),
        startCursor: beforeWindow
          ? feed.startCursor
          : Math.min(event.row.position, feed.startCursor ?? Infinity),
      },
    };
  }
  const known = feed.rows.find((row) => row.id === event.id);
  if (!known) return { feed, missingRowId: event.id };
  if (event.type === 'row.patch')
    return {
      feed: replaceHeldRow(feed, {
        ...known,
        ...event.set,
        revision: event.rev,
      } as SessionUpdate),
    };
  const path = event.field.split('.');
  const heldText = readFeedField(known, path);
  if (typeof heldText !== 'string' || heldText.length !== event.off)
    return { feed, missingRowId: event.id };
  return {
    feed: replaceHeldRow(feed, {
      ...(writeFeedField(known, path, heldText + event.text) as SessionUpdate),
      revision: event.rev,
    }),
  };
}

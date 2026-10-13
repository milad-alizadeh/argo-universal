import {
  type FeedPageOutput,
  type FeedSubscribeOutput,
  type FeedSyncPoint,
  type SessionUpdate,
} from '@repo/contracts';
import { keepNewerRevisions, startCursor } from './feed-revisions';
import { applyHeldEvent, applyUpsert } from './feed-row-events';

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

// Where live changes resume for the rows held, such as after the Server closed the Feed; null before the first page.
export function syncPointOf(feed: FeedState): FeedSyncPoint | null {
  return feed.epoch === null
    ? null
    : { epoch: feed.epoch, revision: feed.revision };
}

// The newest rows; a page from a new epoch replaces everything held.
export function mergeNewestPage(
  feed: FeedState,
  page: FeedPageOutput,
): FeedState {
  const rows = keepNewerRevisions(heldPageRows(feed, page), page.rows);

  return {
    epoch: page.epoch,
    revision: newestRevision(feed, page),
    rows,
    hasOlder: hasOlderRows(feed, page),
    startCursor: startCursor(rows),
  };
}

function newestRevision(feed: FeedState, page: FeedPageOutput): number {
  return page.epoch === feed.epoch
    ? Math.max(feed.revision, page.maxRevision)
    : page.maxRevision;
}

function hasOlderRows(feed: FeedState, page: FeedPageOutput): boolean {
  return page.epoch !== feed.epoch || feed.rows.length === 0
    ? page.hasOlder
    : feed.hasOlder;
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
    startCursor: startCursor(rows),
  };
}

// Applies one `feed.subscribe` row event to the held window.
export function applySubscriptionEvent(
  feed: FeedState,
  event: Exclude<FeedSubscribeOutput, { type: 'snapshot' | 'closed' }>,
): SubscriptionEventResult {
  if (event.type === 'reset')
    return { feed: { ...emptyFeed, epoch: event.epoch }, reset: true };

  if (event.type === 'row.upsert') return applyUpsert(feed, event);

  return applyHeldEvent(feed, event);
}

function heldPageRows(
  feed: FeedState,
  page: FeedPageOutput,
): FeedState['rows'] {
  return page.epoch === feed.epoch ? feed.rows : [];
}

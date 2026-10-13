import {
  type FeedSubscribeOutput,
  readFeedField,
  type SessionUpdate,
  writeFeedRowField,
} from '@repo/contracts';
import { keepNewerRevisions } from './feed-revisions';
import type { FeedState, SubscriptionEventResult } from './feed-state';

type Upsert = Extract<FeedSubscribeOutput, { type: 'row.upsert' }>;

type HeldEvent = Extract<
  FeedSubscribeOutput,
  { type: 'row.patch' | 'row.append' }
>;

type Append = Extract<HeldEvent, { type: 'row.append' }>;

function isBeforeWindow(feed: FeedState, row: SessionUpdate): boolean {
  if (!feed.hasOlder) return false;

  return feed.startCursor !== null && row.position < feed.startCursor;
}

function earliestCursor(feed: FeedState, row: SessionUpdate): number {
  return Math.min(row.position, feed.startCursor ?? Infinity);
}

export function applyUpsert(
  feed: FeedState,
  event: Upsert,
): SubscriptionEventResult {
  const beforeWindow = isBeforeWindow(feed, event.row);

  return {
    feed: {
      ...feed,
      revision: Math.max(feed.revision, event.rev),
      rows: upsertRows(feed, event.row, beforeWindow),
      startCursor: upsertCursor(feed, event.row, beforeWindow),
    },
  };
}

function replaceHeldRow(feed: FeedState, revised: SessionUpdate): FeedState {
  return {
    ...feed,
    revision: Math.max(feed.revision, revised.revision),
    rows: feed.rows.map((held) => (held.id === revised.id ? revised : held)),
  };
}

function appendFits(
  heldText: ReturnType<typeof readFeedField>,
  event: Append,
): heldText is string {
  return typeof heldText === 'string' && heldText.length === event.off;
}

function applyAppend(
  feed: FeedState,
  known: SessionUpdate,
  event: Append,
): SubscriptionEventResult {
  const heldText = readFeedField(known, event.field.split('.'));

  if (!appendFits(heldText, event)) return { feed, missingRowId: event.id };

  return {
    feed: replaceHeldRow(feed, {
      ...known,
      ...writeFeedRowField(known, event.field, heldText + event.text),
      revision: event.rev,
    }),
  };
}

export function applyHeldEvent(
  feed: FeedState,
  event: HeldEvent,
): SubscriptionEventResult {
  const known = feed.rows.find((row) => row.id === event.id);

  if (!known) return { feed, missingRowId: event.id };

  if (event.type === 'row.append') return applyAppend(feed, known, event);

  return {
    feed: replaceHeldRow(feed, { ...known, ...event.set, revision: event.rev }),
  };
}

function upsertRows(
  feed: FeedState,
  row: SessionUpdate,
  beforeWindow: boolean,
): FeedState['rows'] {
  return beforeWindow ? feed.rows : keepNewerRevisions(feed.rows, [row]);
}

function upsertCursor(
  feed: FeedState,
  row: SessionUpdate,
  beforeWindow: boolean,
): number | null {
  return beforeWindow ? feed.startCursor : earliestCursor(feed, row);
}

import {
  type FeedSubscribeOutput,
  readFeedField,
  type SessionUpdate,
  writeFeedRowField,
} from '@repo/contracts';
import { keepNewerRevisions } from './feed-revisions';
import type { FeedState, SubscriptionEventResult } from './feed-state';
import { laterPlan } from './held-plan';

type Upsert = Extract<FeedSubscribeOutput, { type: 'row.upsert' }>;

type HeldEvent = Extract<
  FeedSubscribeOutput,
  { type: 'row.patch' | 'row.append' }
>;

type Append = Extract<HeldEvent, { type: 'row.append' }>;

function isBeforeCursor(
  hasOlder: boolean,
  startCursor: number | null,
  row: SessionUpdate,
): boolean {
  if (!hasOlder) return false;

  return startCursor !== null && row.position < startCursor;
}

function isBeforeWindow(feed: FeedState, row: SessionUpdate): boolean {
  return isBeforeCursor(feed.hasOlder, feed.startCursor, row);
}

function earliestCursor(feed: FeedState, row: SessionUpdate): number {
  return Math.min(row.position, feed.startCursor ?? Infinity);
}

export function applyUpsert(
  feed: FeedState,
  event: Upsert,
): SubscriptionEventResult {
  return { feed: upsertRow(feed, event.row, event.rev) };
}

// A whole row, from a `row.upsert` or fetched with `feed.row` at its own revision.
export function upsertRow(
  feed: FeedState,
  row: SessionUpdate,
  rev = row.revision,
): FeedState {
  const beforeWindow = isBeforeWindow(feed, row);

  return {
    ...feed,
    revision: Math.max(feed.revision, rev),
    rows: upsertRows(feed, row, beforeWindow),
    startCursor: upsertCursor(feed, row, beforeWindow),
    plan: beforeWindow ? laterPlan(feed.plan, row) : feed.plan,
  };
}

// Whole rows, as `upsertRow` would apply them one after another, with the held rows merged once.
export function upsertRowsOnce(
  feed: FeedState,
  incoming: readonly SessionUpdate[],
): FeedState {
  let startCursor = feed.startCursor;
  let plan = feed.plan;
  const inWindow: SessionUpdate[] = [];

  for (const row of incoming) {
    if (isBeforeCursor(feed.hasOlder, startCursor, row)) {
      plan = laterPlan(plan, row);
      continue;
    }

    inWindow.push(row);
    startCursor = Math.min(row.position, startCursor ?? Infinity);
  }

  return {
    ...feed,
    revision: incoming.reduce(
      (newest, row) => Math.max(newest, row.revision),
      feed.revision,
    ),
    rows: keepNewerRevisions(feed.rows, inWindow),
    startCursor,
    plan,
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

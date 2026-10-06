import type {
  FeedPageOutput,
  FeedSubscribeOutput,
  SessionUpdate,
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

export interface FeedEventResult {
  feed: FeedState;
  // A row the event could not be applied to; the App fetches it whole with `feed.row`.
  fetchRow?: string;
  // The Server rebuilt the Feed; the App pages the tail again.
  reset?: true;
}

const byPosition = (first: SessionUpdate, second: SessionUpdate) =>
  first.position - second.position;

// Keeps the newer revision of each row, ordered by position.
function merge(
  rows: readonly SessionUpdate[],
  incoming: readonly SessionUpdate[],
): readonly SessionUpdate[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  let changed = false;
  for (const row of incoming) {
    const known = byId.get(row.id);
    if (known && known.revision >= row.revision) continue;
    byId.set(row.id, row);
    changed = true;
  }
  return changed ? [...byId.values()].sort(byPosition) : rows;
}

// The newest rows; a page from a new epoch replaces everything held.
export function receiveTail(feed: FeedState, page: FeedPageOutput): FeedState {
  const fresh = feed.epoch !== page.epoch;
  const rows = merge(fresh ? [] : feed.rows, page.rows);
  return {
    epoch: page.epoch,
    revision: fresh
      ? page.maxRevision
      : Math.max(feed.revision, page.maxRevision),
    rows,
    hasOlder: fresh || feed.rows.length === 0 ? page.hasOlder : feed.hasOlder,
    startCursor: rows[0]?.position ?? null,
  };
}

// Rows before the window; a stale cursor brings the tail of a new epoch instead.
export function receiveOlder(feed: FeedState, page: FeedPageOutput): FeedState {
  if (page.staleCursor) return receiveTail(emptyFeed, page);
  if (page.epoch !== feed.epoch) return feed;
  const rows = merge(feed.rows, page.rows);
  return {
    ...feed,
    rows,
    hasOlder: page.hasOlder,
    startCursor: rows[0]?.position ?? null,
  };
}

// The string at a dotted path such as `content.0.text`.
function readAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function writeAtPath(
  value: unknown,
  [key, ...rest]: readonly string[],
  text: string,
): unknown {
  if (key === undefined) return text;
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[Number(key)] = writeAtPath(value[Number(key)], rest, text);
    return copy;
  }
  const record = value as Record<string, unknown>;
  return { ...record, [key]: writeAtPath(record[key], rest, text) };
}

function replaceRow(
  feed: FeedState,
  row: SessionUpdate,
  rev: number,
): FeedState {
  return {
    ...feed,
    revision: Math.max(feed.revision, rev),
    rows: feed.rows.map((known) => (known.id === row.id ? row : known)),
  };
}

// Applies one `feed.subscribe` row event to the held window.
export function applyFeedEvent(
  feed: FeedState,
  event: Exclude<FeedSubscribeOutput, { type: 'snapshot' }>,
): FeedEventResult {
  if (event.type === 'reset')
    return { feed: { ...emptyFeed, epoch: event.epoch }, reset: true };
  const revision = Math.max(feed.revision, event.rev);
  if (event.type === 'row.upsert') {
    // A row older than the window arrives with its page.
    const older =
      feed.hasOlder &&
      feed.startCursor !== null &&
      event.row.position < feed.startCursor;
    return {
      feed: {
        ...feed,
        revision,
        rows: older ? feed.rows : merge(feed.rows, [event.row]),
        startCursor: older
          ? feed.startCursor
          : Math.min(event.row.position, feed.startCursor ?? Infinity),
      },
    };
  }
  const known = feed.rows.find((row) => row.id === event.id);
  if (!known) return { feed, fetchRow: event.id };
  if (event.type === 'row.patch')
    return {
      feed: replaceRow(
        feed,
        { ...known, ...event.set, revision: event.rev } as SessionUpdate,
        event.rev,
      ),
    };
  const path = event.field.split('.');
  const current = readAtPath(known, path);
  if (typeof current !== 'string' || current.length !== event.off)
    return { feed, fetchRow: event.id };
  return {
    feed: replaceRow(
      feed,
      {
        ...(writeAtPath(known, path, current + event.text) as SessionUpdate),
        revision: event.rev,
      },
      event.rev,
    ),
  };
}

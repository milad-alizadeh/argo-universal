import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, asc, eq, gt, lte, type SQL } from 'drizzle-orm';
import type { WriterActorRef } from '../storage';
import type { FeedActorRef } from './feed-machine';
import {
  hydrateStoredFeedRow,
  newestRows,
  storedFeedColumns,
} from './feed-row';
import { readQueuedFeed } from './feed-storage';

export interface FeedRowSources {
  database: Database;
  // The feed actor of an open Session; a closed Session has none.
  findFeed: (sessionId: string) => FeedActorRef | undefined;
  findWriter: () => WriterActorRef | undefined;
}

export interface RevisionRange {
  after: number;
  through?: number;
}

export const byRevision = (
  first: SessionUpdate,
  second: SessionUpdate,
): number => first.revision - second.revision;

// Rows the database does not hold yet, and the highest revision among them.
interface UnsavedRows {
  rows: SessionUpdate[];
  maxRevision: number;
}

const readMemoryRows = (
  sources: FeedRowSources,
  sessionId: string,
): UnsavedRows => {
  const feed = sources.findFeed(sessionId)?.getSnapshot().context;

  if (!feed) return { rows: [], maxRevision: 0 };

  return { rows: Object.values(feed.rows), maxRevision: feed.maxRevision };
};

// Rows the database does not hold yet: queued in the writer, then held by the feed actor.
export const readUnsavedRows = (
  sources: FeedRowSources,
  sessionId: string,
): UnsavedRows => {
  const pending = readQueuedFeed(sources.findWriter(), sessionId);
  const feed = readMemoryRows(sources, sessionId);

  return {
    rows: [...pending.rows, ...feed.rows],
    maxRevision: Math.max(0, pending.maxRevision, feed.maxRevision),
  };
};

export const readStoredRows = (
  database: Database,
  sessionId: string,
  range: RevisionRange & { limit: number },
): SessionUpdate[] =>
  database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(revisionFilter(sessionId, range))
    .orderBy(asc(feedRow.revision))
    .limit(range.limit)
    .all()
    .map((stored): SessionUpdate => hydrateStoredFeedRow(sessionId, stored));

// The newest copy of each row changed in the range, oldest change first; a row whose newest change is past `range.through` waits for a later read.
export const readChangedRows = (
  sources: FeedRowSources,
  sessionId: string,
  { stored, range }: { stored: SessionUpdate[]; range: RevisionRange },
): SessionUpdate[] => {
  const unsaved = readUnsavedRows(sources, sessionId).rows.filter(
    (row): boolean => row.revision > range.after,
  );

  return [...newestRows([...stored, ...unsaved]).values()]
    .filter((row): boolean => row.revision <= (range.through ?? Infinity))
    .sort(byRevision);
};

function revisionFilter(
  sessionId: string,
  range: RevisionRange,
): SQL | undefined {
  return and(
    eq(feedRow.sessionId, sessionId),
    gt(feedRow.revision, range.after),
    range.through === undefined
      ? undefined
      : lte(feedRow.revision, range.through),
  );
}

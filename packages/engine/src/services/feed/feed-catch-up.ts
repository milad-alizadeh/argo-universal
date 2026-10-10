import type { RowUpsert, SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, asc, eq, gt, lte } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import type { FeedStreamEvent } from './feed-change';
import type { FeedActorRef } from './feed-machine';
import {
  hydrateStoredFeedRow,
  newestRows,
  storedFeedColumns,
} from './feed-row';
import type { writerMachine } from './writer-machine';
import { readWriterProjection } from './writer-projection';

const catchUpPageRows = 200;

export interface FeedRowSources {
  database: Database;
  // The feed actor of an open Session; a closed Session has none.
  findFeed: (sessionId: string) => FeedActorRef | undefined;
  findWriter: () => ActorRefFrom<typeof writerMachine> | undefined;
}

interface RevisionRange {
  after: number;
  through?: number;
  limit?: number;
}

const byRevision = (first: SessionUpdate, second: SessionUpdate): number =>
  first.revision - second.revision;

// Rows the database does not hold yet: queued in the writer, then held by the feed actor.
const readUnsavedRows = (
  sources: FeedRowSources,
  sessionId: string,
): { rows: SessionUpdate[]; maxRevision: number } => {
  const pending = readWriterProjection(sources.findWriter()).feed(sessionId);
  const feed = sources.findFeed(sessionId)?.getSnapshot().context;
  return {
    rows: [...pending.rows, ...Object.values(feed?.rows ?? {})],
    maxRevision: Math.max(0, pending.maxRevision, feed?.maxRevision ?? 0),
  };
};

const readStoredRows = (
  database: Database,
  sessionId: string,
  range: RevisionRange,
): SessionUpdate[] =>
  database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        gt(feedRow.revision, range.after),
        range.through === undefined
          ? undefined
          : lte(feedRow.revision, range.through),
      ),
    )
    .orderBy(asc(feedRow.revision))
    .limit(range.limit ?? -1)
    .all()
    .map((stored): SessionUpdate => hydrateStoredFeedRow(sessionId, stored));

const isInRange = (row: SessionUpdate, range: RevisionRange): boolean =>
  row.revision > range.after && row.revision <= (range.through ?? Infinity);

// The newest copy of each row whose change falls in `range`, stored or not, oldest change first.
const readChangedRows = (
  sources: FeedRowSources,
  sessionId: string,
  range: RevisionRange,
): SessionUpdate[] => {
  const unsaved = readUnsavedRows(sources, sessionId).rows.filter(
    (row): boolean => isInRange(row, range),
  );
  const stored = readStoredRows(sources.database, sessionId, range);
  return [...newestRows([...stored, ...unsaved]).values()]
    .sort(byRevision)
    .slice(0, range.limit);
};

// What a subscriber missed after its sync point, a page at a time, up to the revision captured when it subscribed.
export class FeedCatchUp {
  public readonly highWaterMark: number;
  public readonly firstPage: readonly SessionUpdate[];
  private cursor: number;
  private complete = false;

  // The first page is read with the high-water mark, so a catch-up that fits in it misses no change.
  public constructor(
    private readonly sources: FeedRowSources,
    private readonly sessionId: string,
    syncPoint: { after: number; storedRevision: number },
  ) {
    this.highWaterMark = Math.max(
      syncPoint.storedRevision,
      readUnsavedRows(sources, sessionId).maxRevision,
    );
    this.cursor = syncPoint.after;
    this.firstPage = this.readPage();
  }

  public readNextPage(): readonly SessionUpdate[] {
    return this.complete ? [] : this.readPage();
  }

  // Rows that changed past the high-water mark between pages; their changes up to it may never have been sent.
  public readMovedRows(): SessionUpdate[] {
    if (this.firstPage.length < catchUpPageRows) return [];
    return readChangedRows(this.sources, this.sessionId, {
      after: this.highWaterMark,
    });
  }

  private readPage(): readonly SessionUpdate[] {
    const page = readChangedRows(this.sources, this.sessionId, {
      after: this.cursor,
      through: this.highWaterMark,
      limit: catchUpPageRows,
    });
    this.cursor = page.at(-1)?.revision ?? this.highWaterMark;
    this.complete = page.length < catchUpPageRows;
    return page;
  }
}

const changedRowId = (event: FeedStreamEvent): string =>
  event.type === 'row.upsert' ? event.row.id : event.id;

// Sends each moved row whole at its own revision, before the first live change after it, in place of its older live changes.
export class MovedRowDelivery {
  private readonly waiting: SessionUpdate[];
  private readonly sentRevisions = new Map<string, number>();

  public constructor(movedRows: readonly SessionUpdate[]) {
    this.waiting = movedRows.toSorted(byRevision);
  }

  public *deliver(
    event: FeedStreamEvent,
  ): Generator<FeedStreamEvent | RowUpsert> {
    yield* this.releaseThrough(event.rev);
    if ((this.sentRevisions.get(changedRowId(event)) ?? 0) < event.rev)
      yield event;
  }

  public *releaseThrough(revision = Infinity): Generator<RowUpsert> {
    for (
      let row = this.waiting[0];
      row && row.revision <= revision;
      row = this.waiting[0]
    ) {
      this.waiting.shift();
      this.sentRevisions.set(row.id, row.revision);
      yield { type: 'row.upsert', rev: row.revision, row };
    }
  }
}

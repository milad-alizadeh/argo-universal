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
// SQLite reads every row for a negative LIMIT.
const everyRow = -1;

export interface FeedRowSources {
  database: Database;
  // The feed actor of an open Session; a closed Session has none.
  findFeed: (sessionId: string) => FeedActorRef | undefined;
  findWriter: () => ActorRefFrom<typeof writerMachine> | undefined;
}

interface RevisionRange {
  after: number;
  through?: number;
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
  range: RevisionRange & { limit: number },
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
    .limit(range.limit)
    .all()
    .map((stored): SessionUpdate => hydrateStoredFeedRow(sessionId, stored));

// The newest copy of each row changed in the range, oldest change first; a row whose newest change is past `range.through` waits for a later read.
const readChangedRows = (
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

// What a subscriber missed after its sync point, a page at a time, up to the revision captured when it subscribed.
export class FeedCatchUp {
  private readonly highWaterMark: number;
  private readonly firstPage: readonly SessionUpdate[];
  private readonly fitsOnePage: boolean;
  private pagesRead = 0;
  private cursor: number;

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
    this.fitsOnePage = this.isComplete();
  }

  public readNextPage(): readonly SessionUpdate[] {
    this.pagesRead += 1;
    if (this.pagesRead === 1) return this.firstPage;
    return this.readPage();
  }

  public isPastHighWaterMark(revision: number): boolean {
    return revision > this.highWaterMark;
  }

  // Rows whose change up to the high-water mark a later page could no longer see, because they changed again past it.
  public readMovedRows(): SessionUpdate[] {
    if (this.fitsOnePage) return [];
    return readChangedRows(this.sources, this.sessionId, {
      stored: readStoredRows(this.sources.database, this.sessionId, {
        after: this.highWaterMark,
        limit: everyRow,
      }),
      range: { after: this.highWaterMark },
    });
  }

  private isComplete(): boolean {
    return this.cursor >= this.highWaterMark;
  }

  // A page ends at its last stored row, so a stored row whose newer copy is not saved yet does not end the catch-up early.
  private readPage(): readonly SessionUpdate[] {
    let page: SessionUpdate[] = [];
    while (page.length === 0 && !this.isComplete()) {
      const range = { after: this.cursor, through: this.highWaterMark };
      const stored = readStoredRows(this.sources.database, this.sessionId, {
        ...range,
        limit: catchUpPageRows,
      });
      this.cursor =
        stored.length < catchUpPageRows
          ? this.highWaterMark
          : (stored.at(-1)?.revision ?? this.highWaterMark);
      page = readChangedRows(this.sources, this.sessionId, {
        stored,
        range: { ...range, through: this.cursor },
      });
    }
    return page;
  }
}

const changedRowId = (event: FeedStreamEvent): string =>
  event.type === 'row.upsert' ? event.row.id : event.id;

// Sends each moved row whole at its own revision, before the first live change after it, in place of its older live changes.
export class MovedRowDelivery {
  private readonly waiting: SessionUpdate[];
  private readonly movedRevisions: ReadonlyMap<string, number>;

  public constructor(movedRows: readonly SessionUpdate[]) {
    this.waiting = movedRows.toSorted(byRevision);
    this.movedRevisions = new Map(
      movedRows.map((row): [string, number] => [row.id, row.revision]),
    );
  }

  public *deliver(
    event: FeedStreamEvent,
  ): Generator<FeedStreamEvent | RowUpsert> {
    yield* this.releaseThrough(event.rev);
    if ((this.movedRevisions.get(changedRowId(event)) ?? 0) < event.rev)
      yield event;
  }

  public *releaseThrough(revision = Infinity): Generator<RowUpsert> {
    for (
      let row = this.waiting[0];
      row && row.revision <= revision;
      row = this.waiting[0]
    ) {
      this.waiting.shift();
      yield { type: 'row.upsert', rev: row.revision, row };
    }
  }
}

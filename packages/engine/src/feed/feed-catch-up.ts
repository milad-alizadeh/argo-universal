import type { SessionUpdate } from '@repo/contracts';
import {
  readChangedRows,
  readStoredRows,
  readUnsavedRows,
  type FeedRowSources,
} from './feed-catch-up-rows';
export type { FeedRowSources } from './feed-catch-up-rows';

const catchUpPageRows = 200;
const everyRow = -1;

// What a subscriber missed after its sync point, a page at a time, up to the revision captured when it subscribed.
export class FeedCatchUp {
  public readonly highWaterMark: number;
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
      page = this.readStoredPage();
    }
    return page;
  }
  private readStoredPage(): SessionUpdate[] {
    const range = { after: this.cursor, through: this.highWaterMark };
    const stored = readStoredRows(this.sources.database, this.sessionId, {
      ...range,
      limit: catchUpPageRows,
    });
    this.cursor = this.pageEnd(stored);
    return readChangedRows(this.sources, this.sessionId, {
      stored,
      range: { ...range, through: this.cursor },
    });
  }

  private pageEnd(stored: SessionUpdate[]): number {
    const last = stored.at(-1);
    if (stored.length < catchUpPageRows || !last) return this.highWaterMark;
    return last.revision;
  }
}

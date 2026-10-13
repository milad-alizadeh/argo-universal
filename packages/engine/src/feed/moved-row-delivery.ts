import type { RowUpsert, SessionUpdate } from '@repo/contracts';
import { byRevision } from './feed-catch-up-rows';
import type { FeedStreamEvent } from './feed-change';

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

  private isReady(
    row: SessionUpdate | undefined,
    revision: number,
  ): row is SessionUpdate {
    return row !== undefined && row.revision <= revision;
  }

  public *releaseThrough(revision = Infinity): Generator<RowUpsert> {
    for (
      let row = this.waiting[0];
      this.isReady(row, revision);
      row = this.waiting[0]
    ) {
      this.waiting.shift();
      yield { type: 'row.upsert', rev: row.revision, row };
    }
  }
}

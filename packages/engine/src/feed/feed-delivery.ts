import type { FeedSubscribeOutput, RowUpsert } from '@repo/contracts';
import type { FeedDeps } from './feed';
import { FeedCatchUp } from './feed-catch-up';
import type { ClosedFeed } from './feed-listener';
import type { LiveFeedEvent } from './live-feed-queue';
import { MovedRowDelivery } from './moved-row-delivery';

type SyncPoint = { after: number; storedRevision: number };

function* catchUpRows(catchUp: FeedCatchUp): Generator<RowUpsert> {
  for (
    let page = catchUp.readNextPage();
    page.length > 0;
    page = catchUp.readNextPage()
  )
    for (const row of page)
      yield { type: 'row.upsert', rev: row.revision, row };
}

export class FeedDelivery {
  private catchUp: FeedCatchUp;
  private movedRows = new MovedRowDelivery([]);
  private delivered = 0;

  public constructor(
    private readonly sources: FeedDeps,
    private readonly sessionId: string,
    syncPoint: SyncPoint,
  ) {
    this.catchUp = new FeedCatchUp(sources, sessionId, syncPoint);
  }

  public *readCatchUp(): Generator<FeedSubscribeOutput> {
    yield* catchUpRows(this.catchUp);
    this.movedRows = new MovedRowDelivery(this.catchUp.readMovedRows());
    this.delivered = Math.max(this.delivered, this.catchUp.highWaterMark);
  }

  public *recover(): Generator<FeedSubscribeOutput> {
    this.catchUp = new FeedCatchUp(this.sources, this.sessionId, {
      after: this.delivered,
      storedRevision: this.sources.readSession(this.sessionId).maxRevision,
    });
    yield* this.readCatchUp();
  }

  public *deliver(event: LiveFeedEvent): Generator<FeedSubscribeOutput> {
    if (event.type === 'snapshot') {
      yield event;

      return;
    }

    if (!this.catchUp.isPastHighWaterMark(event.rev)) return;
    yield* this.movedRows.deliver(event);
    this.delivered = event.rev;
  }

  public *close(event: ClosedFeed): Generator<FeedSubscribeOutput> {
    yield* this.movedRows.releaseThrough();
    yield event;
  }
}

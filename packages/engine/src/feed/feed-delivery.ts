import type { FeedSubscribeOutput, RowUpsert } from '@repo/contracts';
import type { FeedDeps } from './feed';
import { FeedCatchUp } from './feed-catch-up';
import type { ClosedFeed } from './feed-listener';
import type { LiveFeedEvent } from './live-feed-queue';
import { VoiceMarkerFilter } from './marker-filter';
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
  private readonly marks = new VoiceMarkerFilter();

  public constructor(
    private readonly sources: FeedDeps,
    private readonly sessionId: string,
    syncPoint: SyncPoint,
  ) {
    this.catchUp = new FeedCatchUp(sources, sessionId, syncPoint);
  }

  // Everything delivered leaves without the voice marks of Agent messages.
  private *unmarked(
    outputs: Generator<FeedSubscribeOutput>,
  ): Generator<FeedSubscribeOutput> {
    for (const output of outputs) yield this.marks.output(output);
  }

  public readCatchUp(): Generator<FeedSubscribeOutput> {
    return this.unmarked(this.readCaughtUp());
  }

  public recover(): Generator<FeedSubscribeOutput> {
    return this.unmarked(this.recovered());
  }

  public deliver(event: LiveFeedEvent): Generator<FeedSubscribeOutput> {
    return this.unmarked(this.delivering(event));
  }

  public close(event: ClosedFeed): Generator<FeedSubscribeOutput> {
    return this.unmarked(this.closing(event));
  }

  private *readCaughtUp(): Generator<FeedSubscribeOutput> {
    yield* catchUpRows(this.catchUp);
    this.movedRows = new MovedRowDelivery(this.catchUp.readMovedRows());
    this.delivered = Math.max(this.delivered, this.catchUp.highWaterMark);
  }

  private *recovered(): Generator<FeedSubscribeOutput> {
    this.catchUp = new FeedCatchUp(this.sources, this.sessionId, {
      after: this.delivered,
      storedRevision: this.sources.readSession(this.sessionId).maxRevision,
    });
    yield* this.readCaughtUp();
  }

  private *delivering(event: LiveFeedEvent): Generator<FeedSubscribeOutput> {
    if (event.type === 'snapshot') {
      yield event;

      return;
    }

    if (!this.catchUp.isPastHighWaterMark(event.rev)) return;
    yield* this.movedRows.deliver(event);
    this.delivered = event.rev;
  }

  private *closing(event: ClosedFeed): Generator<FeedSubscribeOutput> {
    yield* this.movedRows.releaseThrough();
    yield event;
  }
}

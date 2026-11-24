import type {
  FeedSubscribeOutput,
  RowsUpsert,
  RowUpsert,
  SessionUpdate,
} from '@repo/contracts';
import type { FeedDeps } from './feed';
import { FeedCatchUp } from './feed-catch-up';
import type { ClosedFeed } from './feed-listener';
import type { LiveFeedEvent } from './live-feed-queue';
import { VoiceMarkerFilter } from './marker-filter';
import { MovedRowDelivery } from './moved-row-delivery';

type SyncPoint = { after: number; storedRevision: number };

// Where a subscriber resumes, and whether it reads a catch-up in batches of rows.
type Start = SyncPoint & { batched: boolean };

// A page of rows as one event for an App that reads batches (its last row's revision names the event), or one per row.
function* pageEvents(
  page: readonly SessionUpdate[],
  batched: boolean,
): Generator<RowUpsert | RowsUpsert> {
  const last = page.at(-1);

  if (batched && last) {
    yield { type: 'rows.upsert', rev: last.revision, rows: [...page] };

    return;
  }

  for (const row of page) yield { type: 'row.upsert', rev: row.revision, row };
}

function* catchUpRows(
  catchUp: FeedCatchUp,
  batched: boolean,
): Generator<RowUpsert | RowsUpsert> {
  for (
    let page = catchUp.readNextPage();
    page.length > 0;
    page = catchUp.readNextPage()
  )
    yield* pageEvents(page, batched);
}

export class FeedDelivery {
  private catchUp: FeedCatchUp;
  private movedRows = new MovedRowDelivery([]);
  private delivered = 0;
  private readonly marks = new VoiceMarkerFilter();
  private readonly batched: boolean;

  public constructor(
    private readonly sources: FeedDeps,
    private readonly sessionId: string,
    start: Start,
  ) {
    this.batched = start.batched;
    this.catchUp = new FeedCatchUp(sources, sessionId, start);
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
    yield* catchUpRows(this.catchUp, this.batched);
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

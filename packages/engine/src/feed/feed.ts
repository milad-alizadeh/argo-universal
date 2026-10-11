import type { SessionUpdate } from '@repo/contracts';
import type {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, lt } from 'drizzle-orm';
import type { Subscription } from 'xstate';
import type {
  createSessionReader,
  createSessionSnapshotWatcher,
} from '../sessions';
import {
  FeedCatchUp,
  type FeedRowSources,
  MovedRowDelivery,
} from './feed-catch-up';
import type { FeedActorRef } from './feed-machine';
import {
  hydrateStoredFeedRow,
  readWrittenRow,
  storedFeedColumns,
} from './feed-row';
import { readQueuedFeedRow } from './feed-storage';
import { LiveFeedQueue } from './live-feed-queue';

export interface FeedDeps extends FeedRowSources {
  readSession: ReturnType<typeof createSessionReader>;
  watchSessionSnapshot: ReturnType<typeof createSessionSnapshotWatcher>;
}

// Stored rows only: the subscription's catch-up adds what the writer has not committed.
export function readFeedPage(
  { database, readSession }: Pick<FeedDeps, 'database' | 'readSession'>,
  pageInput: FeedPageInput,
): FeedPageOutput {
  const { epoch, maxRevision } = readSession(pageInput.sessionId);
  const staleCursor =
    pageInput.epoch !== undefined && pageInput.epoch !== epoch;
  const cursor =
    pageInput.direction === 'before' && !staleCursor
      ? pageInput.cursor
      : undefined;
  const newestFirst = database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, pageInput.sessionId),
        cursor === undefined ? undefined : lt(feedRow.position, cursor),
      ),
    )
    .orderBy(desc(feedRow.position))
    .limit(pageInput.limit + 1)
    .all();
  const rows = newestFirst
    .slice(0, pageInput.limit)
    .reverse()
    .map((row): SessionUpdate =>
      hydrateStoredFeedRow(pageInput.sessionId, row),
    );
  return {
    epoch,
    maxRevision,
    rows,
    hasOlder: newestFirst.length > pageInput.limit,
    startCursor: rows[0]?.position ?? null,
    staleCursor,
  };
}

export function readFeedRow(
  feedResources: Pick<
    FeedDeps,
    'database' | 'readSession' | 'findFeed' | 'findWriter'
  >,
  { sessionId, id }: FeedRowInput,
): SessionUpdate {
  feedResources.readSession(sessionId);
  // The feed actor holds the newest version of a row it has in memory.
  const newest =
    feedResources.findFeed(sessionId)?.getSnapshot().context.rows[id] ??
    readWrittenRow({
      database: feedResources.database,
      pending: readQueuedFeedRow(feedResources.findWriter(), {
        sessionId,
        id,
      }),
      sessionId,
      id,
    });
  if (!newest)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No row ${id} in Session ${sessionId}`,
    });
  return newest;
}

type CatchUpDelivery = {
  catchUp: FeedCatchUp;
  movedRows: MovedRowDelivery;
};

// Sends the rows changed after `after` a page at a time, up to the high-water mark the catch-up records.
function* deliverCatchUp(
  feedResources: FeedDeps,
  sessionId: string,
  syncPoint: { after: number; storedRevision: number },
): Generator<FeedSubscribeOutput, CatchUpDelivery> {
  const catchUp = new FeedCatchUp(feedResources, sessionId, syncPoint);
  for (
    let page = catchUp.readNextPage();
    page.length > 0;
    page = catchUp.readNextPage()
  )
    for (const row of page)
      yield { type: 'row.upsert', rev: row.revision, row };
  return {
    catchUp,
    movedRows: new MovedRowDelivery(catchUp.readMovedRows()),
  };
}

// Sends every row changed after `after`, then the feed actor's batches. With no sync point, or after `reset` for a new epoch, it skips stored rows, which the App pages. A subscriber too slow for its live queue catches up again from the last revision it was sent.
export async function* streamFeed(
  feedResources: FeedDeps,
  { sessionId, after }: FeedSubscribeInput,
  signal: AbortSignal | undefined,
): AsyncGenerator<FeedSubscribeOutput> {
  const { epoch, maxRevision } = feedResources.readSession(sessionId);

  const live = new LiveFeedQueue();
  let wake: (() => void) | undefined;
  let feed: FeedActorRef | undefined;
  let listener: Subscription | undefined;
  let closed = false;
  let failure: Extract<FeedSubscribeOutput, { type: 'closed' }>['failure'] =
    null;
  let snapshotFailure: { error: unknown } | undefined;
  const watchFeedBatches = (): void => {
    const nextFeed = feedResources.findFeed(sessionId);
    if (!nextFeed || nextFeed === feed) return;
    listener?.unsubscribe();
    feed = nextFeed;
    listener = feed.on('feed.batch', (batch): void => {
      live.push(batch.events);
      wake?.();
    });
  };
  const snapshotListener = feedResources.watchSessionSnapshot(sessionId, {
    next: (event): void => {
      watchFeedBatches();
      if (event.type === 'closed') {
        closed = true;
        failure = event.failure;
      } else live.push([event]);
      wake?.();
    },
    error: (error): void => {
      snapshotFailure = { error };
      wake?.();
    },
  });
  watchFeedBatches();
  const wakeOnAbort = (): void | undefined => wake?.();
  signal?.addEventListener('abort', wakeOnAbort);
  const throwSnapshotFailure = (): void => {
    if (snapshotFailure) throw snapshotFailure.error;
  };

  try {
    throwSnapshotFailure();
    const reset = after !== null && after.epoch !== epoch;
    if (reset) yield { type: 'reset', epoch };
    let delivery = yield* deliverCatchUp(feedResources, sessionId, {
      after: after === null || reset ? maxRevision : after.revision,
      storedRevision: maxRevision,
    });
    let delivered = delivery.catchUp.highWaterMark;

    while (!signal?.aborted) {
      throwSnapshotFailure();
      if (live.takeOverflow()) {
        delivery = yield* deliverCatchUp(feedResources, sessionId, {
          after: delivered,
          storedRevision: feedResources.readSession(sessionId).maxRevision,
        });
        delivered = Math.max(delivered, delivery.catchUp.highWaterMark);
        continue;
      }
      const event = live.shift();
      if (event) {
        if (event.type === 'snapshot') yield event;
        else if (delivery.catchUp.isPastHighWaterMark(event.rev)) {
          yield* delivery.movedRows.deliver(event);
          delivered = event.rev;
        }
        continue;
      }
      if (closed) {
        yield* delivery.movedRows.releaseThrough();
        yield { type: 'closed', failure };
        return;
      }
      await new Promise<void>((resolve): void => {
        wake = resolve;
      });
      wake = undefined;
    }
  } finally {
    listener?.unsubscribe();
    snapshotListener?.unsubscribe();
    signal?.removeEventListener('abort', wakeOnAbort);
  }
}

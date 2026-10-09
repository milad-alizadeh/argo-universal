import type { SessionUpdate } from '@repo/contracts';
import type {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import type { ActorRefFrom, Subscription } from 'xstate';
import type {
  createSessionReader,
  createSessionSnapshotWatcher,
} from '../sessions';
import type { FeedActorRef } from './feed-machine';
import {
  hydrateStoredFeedRow,
  newestRows,
  readWrittenRow,
  storedFeedColumns,
} from './feed-row';
import { queuedFeedRows } from './writer-job';
import type { writerMachine } from './writer-machine';

export interface FeedDeps {
  database: Database;
  // The feed actor of an open Session; a closed Session has none.
  findFeed: (sessionId: string) => FeedActorRef | undefined;
  readSession: ReturnType<typeof createSessionReader>;
  watchSessionSnapshot: ReturnType<typeof createSessionSnapshotWatcher>;
  findWriter: () => ActorRefFrom<typeof writerMachine> | undefined;
}

// Rows the database does not hold yet: queued in the writer, then held by the feed actor.
const readUnsavedRows = (
  feedResources: Pick<FeedDeps, 'findWriter' | 'findFeed'>,
  sessionId: string,
): Pick<FeedPageOutput, 'rows' | 'maxRevision'> => {
  const jobs = queuedFeedRows(
    feedResources.findWriter()?.getSnapshot().context.queue ?? [],
    sessionId,
  );
  const feed = feedResources.findFeed(sessionId)?.getSnapshot().context;
  return {
    rows: [
      ...jobs.flatMap((job): SessionUpdate[] => job.rows),
      ...Object.values(feed?.rows ?? {}),
    ],
    maxRevision: Math.max(
      0,
      ...jobs.map((job): number => job.maxRevision),
      feed?.maxRevision ?? 0,
    ),
  };
};

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
      writer: feedResources.findWriter(),
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

// Every row changed after `from`, stored or not, once each in revision order, and the revision they reach.
const readChangedRows = (
  feedResources: Pick<FeedDeps, 'database' | 'findWriter' | 'findFeed'>,
  sessionId: string,
  afterRevision: number,
): Pick<FeedPageOutput, 'rows' | 'maxRevision'> => {
  const unsaved = readUnsavedRows(feedResources, sessionId);
  const stored = feedResources.database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        gt(feedRow.revision, afterRevision),
      ),
    )
    .orderBy(asc(feedRow.revision))
    .all()
    .map((stored): SessionUpdate => hydrateStoredFeedRow(sessionId, stored));
  return {
    rows: [
      ...newestRows([
        ...stored,
        ...unsaved.rows.filter((row): boolean => row.revision > afterRevision),
      ]).values(),
    ].sort((a, b): number => a.revision - b.revision),
    maxRevision: unsaved.maxRevision,
  };
};

// Sends every row changed after `after`, then the feed actor's batches. With no sync point, or after `reset` for a new epoch, it skips stored rows, which the App pages.
export async function* streamFeed(
  feedResources: FeedDeps,
  { sessionId, after }: FeedSubscribeInput,
  signal: AbortSignal | undefined,
): AsyncGenerator<FeedSubscribeOutput> {
  const { epoch, maxRevision } = feedResources.readSession(sessionId);

  const live: FeedSubscribeOutput[] = [];
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
      live.push(...batch.events);
      wake?.();
    });
  };
  const snapshotListener = feedResources.watchSessionSnapshot(sessionId, {
    next: (event): void => {
      watchFeedBatches();
      if (event.type === 'closed') {
        closed = true;
        failure = event.failure;
      } else live.push(event);
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
    const from = after === null || reset ? maxRevision : after.revision;
    // A waiting batch can carry changes the catch-up already holds; their revision drops them.
    const { rows, maxRevision: unsavedRevision } = readChangedRows(
      feedResources,
      sessionId,
      from,
    );
    const caughtUpTo = Math.max(maxRevision, unsavedRevision);

    if (reset) yield { type: 'reset', epoch };
    for (const row of rows)
      yield { type: 'row.upsert', rev: row.revision, row };

    while (!signal?.aborted) {
      throwSnapshotFailure();
      const event = live.shift();
      if (event) {
        if (
          event.type === 'snapshot' ||
          ('rev' in event && event.rev > caughtUpTo)
        )
          yield event;
        continue;
      }
      if (closed) {
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

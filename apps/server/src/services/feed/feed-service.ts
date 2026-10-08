import type { FeedService } from '@repo/api';
import type {
  SessionInfo,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
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
import type { ActorRefFrom, Observer, Subscription } from 'xstate';
import type { FeedActorRef } from './feed-machine';
import {
  decodeStoredFeedRow,
  fromFeedRow,
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
  readSession: (
    sessionId: string,
  ) => Pick<
    SessionInfo,
    'parentSessionId' | 'agent' | 'title' | 'titleSource'
  > &
    Pick<SessionSnapshot, 'epoch' | 'maxRevision' | 'checkout'>;
  watchSessionSnapshot: (
    sessionId: string,
    listener: Observer<
      Extract<FeedSubscribeOutput, { type: 'snapshot' | 'closed' }>
    >,
  ) => Subscription;
  findWriter: () => ActorRefFrom<typeof writerMachine> | undefined;
}

export function createFeedService(deps: FeedDeps): FeedService {
  const { database } = deps;
  const { readSession } = deps;

  // Rows the database does not hold yet: queued in the writer, then held by the feed actor.
  const readUnsaved = (
    sessionId: string,
  ): Pick<FeedPageOutput, 'rows' | 'maxRevision'> => {
    const jobs = queuedFeedRows(
      deps.findWriter()?.getSnapshot().context.queue ?? [],
      sessionId,
    );
    const feed = deps.findFeed(sessionId)?.getSnapshot().context;
    return {
      rows: [
        ...jobs.flatMap((job): SessionUpdate[] =>
          job.rows.map((row): SessionUpdate => fromFeedRow(sessionId, row)),
        ),
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
  const page = (input: FeedPageInput): ReturnType<FeedService['page']> => {
    const { epoch, maxRevision } = readSession(input.sessionId);
    const staleCursor = input.epoch !== undefined && input.epoch !== epoch;
    const cursor =
      input.direction === 'before' && !staleCursor ? input.cursor : undefined;
    const newestFirst = database
      .select(storedFeedColumns)
      .from(feedRow)
      .where(
        and(
          eq(feedRow.sessionId, input.sessionId),
          cursor === undefined ? undefined : lt(feedRow.position, cursor),
        ),
      )
      .orderBy(desc(feedRow.position))
      .limit(input.limit + 1)
      .all();
    const rows = newestFirst
      .slice(0, input.limit)
      .reverse()
      .map((row): SessionUpdate =>
        fromFeedRow(input.sessionId, decodeStoredFeedRow(row)),
      );
    return {
      epoch,
      maxRevision,
      rows,
      hasOlder: newestFirst.length > input.limit,
      startCursor: rows[0]?.position ?? null,
      staleCursor,
    };
  };

  const row = ({ sessionId, id }: FeedRowInput): SessionUpdate => {
    readSession(sessionId);
    // The feed actor holds the newest version of a row it has in memory.
    const newest =
      deps.findFeed(sessionId)?.getSnapshot().context.rows[id] ??
      readWrittenRow({ database, writer: deps.findWriter(), sessionId, id });
    if (!newest)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No row ${id} in Session ${sessionId}`,
      });
    return newest;
  };

  // Every row changed after `from`, stored or not, once each in revision order, and the revision they reach.
  const catchUp = (
    sessionId: string,
    from: number,
    maxRevision: number,
  ): { rows: SessionUpdate[]; caughtUpTo: number } => {
    const unsaved = readUnsaved(sessionId);
    const stored = database
      .select(storedFeedColumns)
      .from(feedRow)
      .where(and(eq(feedRow.sessionId, sessionId), gt(feedRow.revision, from)))
      .orderBy(asc(feedRow.revision))
      .all()
      .map((stored): SessionUpdate =>
        fromFeedRow(sessionId, decodeStoredFeedRow(stored)),
      );
    return {
      rows: [
        ...newestRows([
          ...stored,
          ...unsaved.rows.filter((row): boolean => row.revision > from),
        ]).values(),
      ].sort((a, b): number => a.revision - b.revision),
      caughtUpTo: Math.max(maxRevision, unsaved.maxRevision),
    };
  };

  // Sends every row changed after `after`, then the feed actor's batches. With no sync point, or after `reset` for a new epoch, it skips stored rows, which the App pages.
  async function* subscribe(
    { sessionId, after }: FeedSubscribeInput,
    signal: AbortSignal | undefined,
  ): AsyncGenerator<FeedSubscribeOutput> {
    const { epoch, maxRevision } = readSession(sessionId);

    const live: FeedSubscribeOutput[] = [];
    let wake: (() => void) | undefined;
    let feed: FeedActorRef | undefined;
    let listener: Subscription | undefined;
    let closed = false;
    let failure: Extract<FeedSubscribeOutput, { type: 'closed' }>['failure'] =
      null;
    let snapshotFailure: { error: unknown } | undefined;
    const watchFeedBatches = (): void => {
      const nextFeed = deps.findFeed(sessionId);
      if (!nextFeed || nextFeed === feed) return;
      listener?.unsubscribe();
      feed = nextFeed;
      listener = feed.on('feed.batch', (batch): void => {
        live.push(...batch.events);
        wake?.();
      });
    };
    const snapshotListener = deps.watchSessionSnapshot(sessionId, {
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
      const { rows, caughtUpTo } = catchUp(sessionId, from, maxRevision);

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

  return { page, row, subscribe };
}

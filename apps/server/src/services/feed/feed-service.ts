import type { FeedService } from '@repo/api';
import type {
  FeedPageInput,
  FeedRowInput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import type { ActorRefFrom, Subscription } from 'xstate';
import { readLiveHeaderRows } from '../sessions/live-header-rows';
import type { SessionActorRef } from '../sessions/session-machine';
import { createSessionReader } from '../sessions/session-record';
import { toSessionSnapshot } from '../sessions/session-snapshot';
import type { FeedActorRef } from './feed-machine';
import { fromFeedRow, newestRows, readWrittenRow } from './feed-row';
import { queuedFeedRows } from './writer-job';
import type { writerMachine } from './writer-machine';

export interface FeedDeps {
  database: Database;
  // The feed actor of an open Session; a closed Session has none.
  findFeed: (sessionId: string) => FeedActorRef | undefined;
  findSession?: (sessionId: string) => SessionActorRef | undefined;
  openSession?: (sessionId: string) => Promise<SessionActorRef>;
  findWriter: () => ActorRefFrom<typeof writerMachine> | undefined;
}

export function createFeedService(deps: FeedDeps): FeedService {
  const { database } = deps;
  const readSession = createSessionReader(database);

  // Rows the database does not hold yet: queued in the writer, then held by the feed actor.
  const readUnsaved = (sessionId: string) => {
    const jobs = queuedFeedRows(
      deps.findWriter()?.getSnapshot().context.queue ?? [],
      sessionId,
    );
    const feed = deps.findFeed(sessionId)?.getSnapshot().context;
    return {
      rows: [
        ...jobs.flatMap((job) =>
          job.rows.map((row) => fromFeedRow(sessionId, row)),
        ),
        ...Object.values(feed?.rows ?? {}),
      ],
      maxRevision: Math.max(
        0,
        ...jobs.map((job) => job.maxRevision),
        feed?.maxRevision ?? 0,
      ),
    };
  };

  // Stored rows only: the subscription's catch-up adds what the writer has not committed.
  const page = (input: FeedPageInput) => {
    const { epoch, maxRevision } = readSession(input.sessionId);
    const staleCursor = input.epoch !== undefined && input.epoch !== epoch;
    const cursor =
      input.direction === 'before' && !staleCursor ? input.cursor : undefined;
    const newestFirst = database
      .select()
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
      .map((row) => fromFeedRow(input.sessionId, row));
    return {
      epoch,
      maxRevision,
      rows,
      hasOlder: newestFirst.length > input.limit,
      startCursor: rows[0]?.position ?? null,
      staleCursor,
    };
  };

  const row = ({ sessionId, id }: FeedRowInput) => {
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
  const catchUp = (sessionId: string, from: number, maxRevision: number) => {
    const unsaved = readUnsaved(sessionId);
    const stored = database
      .select()
      .from(feedRow)
      .where(and(eq(feedRow.sessionId, sessionId), gt(feedRow.revision, from)))
      .orderBy(asc(feedRow.revision))
      .all()
      .map((stored) => fromFeedRow(sessionId, stored));
    return {
      rows: [
        ...newestRows([
          ...stored,
          ...unsaved.rows.filter((row) => row.revision > from),
        ]).values(),
      ].sort((a, b) => a.revision - b.revision),
      caughtUpTo: Math.max(maxRevision, unsaved.maxRevision),
    };
  };

  // Sends every row changed after `after`, then the feed actor's batches. With no sync point, or after `reset` for a new epoch, it skips stored rows, which the App pages.
  async function* subscribe(
    { sessionId, after }: FeedSubscribeInput,
    signal: AbortSignal | undefined,
  ): AsyncGenerator<FeedSubscribeOutput> {
    const { epoch, maxRevision, parentSessionId } = readSession(sessionId);
    if (parentSessionId === null) await deps.openSession?.(sessionId);

    const live: FeedSubscribeOutput[] = [];
    let wake: (() => void) | undefined;
    let feed: FeedActorRef | undefined;
    let listener: Subscription | undefined;
    let feedListener: Subscription | undefined;
    const sessionActor = deps.findSession?.(sessionId);
    let lastSnapshot = '';
    let snapshotFailure: { error: unknown } | undefined;
    const snapshotChanged = () => {
      if (snapshotFailure) return;
      try {
        const nextFeed = deps.findFeed(sessionId);
        if (nextFeed && nextFeed !== feed) {
          listener?.unsubscribe();
          feedListener?.unsubscribe();
          feed = nextFeed;
          listener = feed.on('feed.batch', (batch) => {
            live.push(...batch.events);
            wake?.();
          });
          feedListener = feed.subscribe({
            next: snapshotChanged,
            error: (error) => {
              snapshotFailure = { error };
              wake?.();
            },
          });
        }
        const session = sessionActor?.getSnapshot() ?? null;
        const feedContext = feed?.getSnapshot().context ?? {
          epoch,
          maxRevision,
        };
        const snapshot = toSessionSnapshot(
          session,
          {
            context: {
              ...feedContext,
              rows: readLiveHeaderRows({
                database,
                writer: deps.findWriter(),
                sessionId,
                turnId: session?.context.activeTurnId ?? null,
                rows: 'rows' in feedContext ? feedContext.rows : {},
              }),
            },
          },
          readSession(sessionId),
        );
        const serialized = JSON.stringify(snapshot);
        if (serialized === lastSnapshot) return;
        lastSnapshot = serialized;
        live.push({ type: 'snapshot', snapshot });
        wake?.();
      } catch (error) {
        snapshotFailure = { error };
        wake?.();
      }
    };
    const sessionListener = sessionActor?.subscribe({
      next: snapshotChanged,
      error: (error) => {
        snapshotFailure = { error };
        wake?.();
      },
    });
    snapshotChanged();
    const wakeOnAbort = () => wake?.();
    signal?.addEventListener('abort', wakeOnAbort);
    const throwSnapshotFailure = () => {
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
            (event.type !== 'reset' && event.rev > caughtUpTo)
          )
            yield event;
          continue;
        }
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = undefined;
      }
    } finally {
      listener?.unsubscribe();
      sessionListener?.unsubscribe();
      feedListener?.unsubscribe();
      signal?.removeEventListener('abort', wakeOnAbort);
    }
  }

  return { page, row, subscribe };
}

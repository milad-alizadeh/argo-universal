import type { FeedService } from '@repo/api';
import type {
  FeedPageInput,
  FeedRowInput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
  SessionUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import type { FeedStreamEvent } from './feed-change';
import type { FeedActorRef } from './feed-machine';
import { fromFeedRow, queuedFeedRows, readWrittenRow } from './feed-row';
import type { writerMachine } from './writer-machine';

export interface FeedDeps {
  database: Database;
  // The feed actor of an open Session; a closed Session has none.
  findFeed: (sessionId: string) => FeedActorRef | undefined;
  findWriter: () => ActorRefFrom<typeof writerMachine> | undefined;
}

// Keeps the newest version of each row.
const newestById = (rows: Iterable<SessionUpdate>) => {
  const newest = new Map<string, SessionUpdate>();
  for (const row of rows) {
    const known = newest.get(row.id);
    if (!known || known.revision < row.revision) newest.set(row.id, row);
  }
  return newest;
};

export function createFeedService(deps: FeedDeps): FeedService {
  const { database } = deps;

  const readSession = (sessionId: string) => {
    const stored = database
      .select({ epoch: session.epoch, maxRevision: session.maxRevision })
      .from(session)
      .where(eq(session.id, sessionId))
      .get();
    if (!stored)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No Session ${sessionId}`,
      });
    return stored;
  };

  // Rows the database does not hold yet: queued in the writer, then held by the feed actor.
  const readUnsaved = (sessionId: string) => {
    const jobs = queuedFeedRows(deps.findWriter(), sessionId);
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
        ...newestById([
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
    const { epoch, maxRevision } = readSession(sessionId);

    const live: FeedStreamEvent[] = [];
    let wake: (() => void) | undefined;
    const listener = deps.findFeed(sessionId)?.on('feed.batch', (batch) => {
      live.push(...batch.events);
      wake?.();
    });
    const wakeOnAbort = () => wake?.();
    signal?.addEventListener('abort', wakeOnAbort);

    try {
      const reset = after !== null && after.epoch !== epoch;
      const from = after === null || reset ? maxRevision : after.revision;
      // A waiting batch can carry changes the catch-up already holds; their revision drops them.
      const { rows, caughtUpTo } = catchUp(sessionId, from, maxRevision);

      if (reset) yield { type: 'reset', epoch };
      for (const row of rows)
        yield { type: 'row.upsert', rev: row.revision, row };

      while (!signal?.aborted) {
        const event = live.shift();
        if (event) {
          if (event.rev > caughtUpTo) yield event;
          continue;
        }
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = undefined;
      }
    } finally {
      listener?.unsubscribe();
      signal?.removeEventListener('abort', wakeOnAbort);
    }
  }

  return { page, row, subscribe };
}

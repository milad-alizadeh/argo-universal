import type { FeedService } from '@repo/api';
import type {
  FeedPageInput,
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
import { fromFeedRow } from './feed-row';
import type { WriterJob } from './writer-job';
import type { writerMachine } from './writer-machine';

type FeedRowsJob = Extract<WriterJob, { type: 'feedRows' }>;

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
    const jobs = (deps.findWriter()?.getSnapshot().context.queue ?? []).filter(
      (job): job is FeedRowsJob =>
        job.type === 'feedRows' && job.sessionId === sessionId,
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
    const staleCursor =
      input.direction === 'before' &&
      input.epoch !== undefined &&
      input.epoch !== epoch;
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

  const row = ({ sessionId, id }: { sessionId: string; id: string }) => {
    readSession(sessionId);
    const stored = database
      .select()
      .from(feedRow)
      .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.id, id)))
      .get();
    const newest = newestById([
      ...(stored ? [fromFeedRow(sessionId, stored)] : []),
      ...readUnsaved(sessionId).rows.filter((unsaved) => unsaved.id === id),
    ]).get(id);
    if (!newest)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No row ${id} in Session ${sessionId}`,
      });
    return newest;
  };

  // Sends every row changed after `after`, then the feed actor's batches; a new epoch first sends `reset`.
  async function* subscribe(
    { sessionId, after }: FeedSubscribeInput,
    signal: AbortSignal | undefined,
  ): AsyncGenerator<FeedSubscribeOutput> {
    const { epoch, maxRevision } = readSession(sessionId);

    // Listening before reading means no batch falls between the two; the revision drops what both carry.
    const live: FeedStreamEvent[] = [];
    let wake: (() => void) | undefined;
    const listener = deps.findFeed(sessionId)?.on('feed.batch', (batch) => {
      live.push(...batch.events);
      wake?.();
    });
    const stop = () => wake?.();
    signal?.addEventListener('abort', stop);

    try {
      const reset = after !== null && after.epoch !== epoch;
      const from = after === null || reset ? 0 : after.revision;
      const unsaved = readUnsaved(sessionId);
      const stored = database
        .select()
        .from(feedRow)
        .where(
          and(eq(feedRow.sessionId, sessionId), gt(feedRow.revision, from)),
        )
        .orderBy(asc(feedRow.revision))
        .all()
        .map((stored) => fromFeedRow(sessionId, stored));
      const caughtUpTo = Math.max(maxRevision, unsaved.maxRevision);
      const changed = [
        ...newestById([
          ...stored,
          ...unsaved.rows.filter((row) => row.revision > from),
        ]).values(),
      ].sort((a, b) => a.revision - b.revision);

      if (reset) yield { type: 'reset', epoch };
      for (const row of changed)
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
      signal?.removeEventListener('abort', stop);
    }
  }

  return { page, row, subscribe };
}

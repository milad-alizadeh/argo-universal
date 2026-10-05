import { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import type { FeedRowWrite, WriterJob } from './writer-job';
import type { writerMachine } from './writer-machine';

type WriterRef = ActorRefFrom<typeof writerMachine>;
type FeedRowsJob = Extract<WriterJob, { type: 'feedRows' }>;

// The shape version of `payload` in the rows this Server writes.
const payloadVersion = 1;

// A row as the `feed_row` table stores it: the envelope in columns, the rest in `payload`.
export function toFeedRowWrite(row: SessionUpdate): FeedRowWrite {
  const {
    id,
    sessionId,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    ...payload
  } = row;
  return {
    id,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    payload,
    payloadVersion,
  };
}

// A stored row as a Session update, checked against its kind.
export function fromFeedRow(
  sessionId: string,
  row: Pick<
    FeedRowWrite,
    | 'id'
    | 'position'
    | 'revision'
    | 'turnId'
    | 'state'
    | 'sessionUpdate'
    | 'payload'
  >,
): SessionUpdate {
  return SessionUpdate.parse({
    ...(row.payload as object),
    id: row.id,
    sessionId,
    position: row.position,
    revision: row.revision,
    turnId: row.turnId ?? null,
    state: row.state,
    sessionUpdate: row.sessionUpdate,
  });
}

// The jobs of a Session's rows that the database writer holds until they commit.
export function queuedFeedRows(
  writer: WriterRef | undefined,
  sessionId: string,
): FeedRowsJob[] {
  return (writer?.getSnapshot().context.queue ?? []).filter(
    (job): job is FeedRowsJob =>
      job.type === 'feedRows' && job.sessionId === sessionId,
  );
}

// The newest version of a row the feed actor handed to the database writer, queued or stored.
export function readWrittenRow({
  database,
  writer,
  sessionId,
  id,
}: {
  database: Database;
  writer: WriterRef | undefined;
  sessionId: string;
  id: string;
}): SessionUpdate | undefined {
  const queued = queuedFeedRows(writer, sessionId)
    .flatMap((job) => job.rows)
    .filter((row) => row.id === id)
    .at(-1);
  if (queued) return fromFeedRow(sessionId, queued);
  const stored = database
    .select()
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.id, id)))
    .get();
  return stored && fromFeedRow(sessionId, stored);
}

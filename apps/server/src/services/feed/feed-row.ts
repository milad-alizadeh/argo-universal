import { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import { z } from 'zod';
import {
  type FeedRowsJob,
  type FeedRowWrite,
  queuedFeedRows,
} from './writer-job';
import type { writerMachine } from './writer-machine';

type WriterRef = ActorRefFrom<typeof writerMachine>;

// The shape version of `payload` in the rows this Server writes.
const payloadVersion = 1;

// The blobs that the prompt rows among `rows` show, each once.
export const promptBlobIds = (rows: readonly SessionUpdate[]) => [
  ...new Set(
    rows.flatMap((row) =>
      row.sessionUpdate === 'user_message'
        ? row.content.flatMap((block) =>
            block.type === 'image' ? [block.blob.blobId] : [],
          )
        : [],
    ),
  ),
];

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

// A stored row as a Session update, checked against its kind; a row from another payload version, or with envelope fields in its payload, fails.
export function fromFeedRow(
  sessionId: string,
  row: FeedRowWrite,
): SessionUpdate {
  if (row.payloadVersion !== payloadVersion)
    throw new Error(
      `row ${row.id} has payload version ${row.payloadVersion}, not ${payloadVersion}`,
    );
  const envelope = {
    id: row.id,
    sessionId,
    position: row.position,
    revision: row.revision,
    turnId: row.turnId ?? null,
    state: row.state,
    sessionUpdate: row.sessionUpdate,
  };
  const payload = z.record(z.string(), z.unknown()).parse(row.payload);
  const clash = Object.keys(payload).find((key) =>
    Object.hasOwn(envelope, key),
  );
  if (clash) throw new Error(`row ${row.id} has ${clash} in its payload`);
  return SessionUpdate.parse({ ...payload, ...envelope });
}

// The newest version of a row in jobs that have not committed.
export function findQueuedRow(
  jobs: readonly FeedRowsJob[],
  sessionId: string,
  id: string,
): SessionUpdate | undefined {
  return newestRows(
    queuedFeedRows(jobs, sessionId).flatMap((job) =>
      job.rows.map((row) => fromFeedRow(sessionId, row)),
    ),
  ).get(id);
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
  const queued = findQueuedRow(
    queuedFeedRows(writer?.getSnapshot().context.queue ?? [], sessionId),
    sessionId,
    id,
  );
  if (queued) return queued;
  const stored = database
    .select()
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.id, id)))
    .get();
  return stored && fromFeedRow(sessionId, stored);
}

// Higher revision wins; a tie goes to the later input (stored, queued, then in memory).
export function newestRows(
  rows: Iterable<SessionUpdate>,
): Map<string, SessionUpdate> {
  const newest = new Map<string, SessionUpdate>();
  for (const row of rows) {
    const known = newest.get(row.id);
    if (!known || row.revision >= known.revision) newest.set(row.id, row);
  }
  return newest;
}

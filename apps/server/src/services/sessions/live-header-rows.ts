import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import { fromFeedRow, queuedFeedRows } from '../feed/feed-row';
import type { FeedRowWrite } from '../feed/writer-job';
import type { writerMachine } from '../feed/writer-machine';

let rejectedShapes = 0;

function parseHeaderRow(sessionId: string, row: FeedRowWrite): SessionUpdate {
  try {
    return fromFeedRow(sessionId, row);
  } catch (error) {
    rejectedShapes += 1;
    console.error(
      `sessions: rejected live-header shape #${rejectedShapes}`,
      error,
    );
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unrecognised live-header Feed data',
      cause: error,
    });
  }
}

// Settled thoughts and retry Notices still inform the header after leaving Feed memory.
export function readLiveHeaderRows({
  database,
  writer,
  sessionId,
  turnId,
  rows,
}: {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  sessionId: string;
  turnId: string | null;
  rows: Record<string, SessionUpdate>;
}): Record<string, SessionUpdate> {
  if (turnId === null) return {};
  const stored = database
    .select()
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.turnId, turnId)))
    .all()
    .map((row) => parseHeaderRow(sessionId, row));
  const queued = queuedFeedRows(writer, sessionId).flatMap((job) =>
    job.rows
      .filter((row) => row.turnId === turnId)
      .map((row) => parseHeaderRow(sessionId, row)),
  );
  const newest: Record<string, SessionUpdate> = {};
  for (const row of [...stored, ...queued, ...Object.values(rows)]) {
    if (row.turnId !== turnId) continue;
    const known = newest[row.id];
    if (!known || row.revision >= known.revision) newest[row.id] = row;
  }
  return newest;
}

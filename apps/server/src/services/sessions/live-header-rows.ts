import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
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
  const stored = readStoredHeaderRows({ database, sessionId, turnId }).map(
    (row) => parseHeaderRow(sessionId, row),
  );
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

function readStoredHeaderRows({
  database,
  sessionId,
  turnId,
}: {
  database: Database;
  sessionId: string;
  turnId: string;
}): FeedRowWrite[] {
  const latest = database
    .select()
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.turnId, turnId)))
    .orderBy(desc(feedRow.revision))
    .limit(1)
    .all();
  const thought = database
    .select()
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'agent_thought'),
      ),
    )
    .orderBy(desc(feedRow.position))
    .limit(1)
    .all()
    .filter((row) => row.turnId === turnId);
  const previousTool = database
    .select({ position: feedRow.position })
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'tool_call_update'),
        or(ne(feedRow.turnId, turnId), isNull(feedRow.turnId)),
      ),
    )
    .orderBy(desc(feedRow.position))
    .limit(1);
  const tools = database
    .select()
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'tool_call_update'),
        eq(feedRow.turnId, turnId),
        gt(feedRow.position, sql`coalesce((${previousTool}), -1)`),
        sql`json_extract(${feedRow.payload}, '$.status') in ('pending', 'in_progress')`,
      ),
    )
    .orderBy(desc(feedRow.position))
    .all();
  return [...latest, ...thought, ...tools];
}

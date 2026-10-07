import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import { fromFeedRow, newestRows } from '../feed/feed-row';
import { type FeedRowWrite, queuedFeedRows } from '../feed/writer-job';
import type { writerMachine } from '../feed/writer-machine';

// Settled thoughts and retry Notices still inform the header after leaving Feed memory.
export function createLiveHeaderRowsReader({
  database,
}: {
  database: Database;
}) {
  let rejectedShapes = 0;
  return ({
    writer,
    sessionId,
    turnId,
    rows,
  }: {
    writer: ActorRefFrom<typeof writerMachine> | undefined;
    sessionId: string;
    turnId: string | null;
    rows: Record<string, SessionUpdate>;
  }): { rows: Record<string, SessionUpdate>; rejected: boolean } => {
    if (turnId === null) return { rows: {}, rejected: false };
    const stored = readStoredHeaderRows({ database, sessionId, turnId });
    const queued = queuedFeedRows(
      writer?.getSnapshot().context.queue ?? [],
      sessionId,
    ).flatMap((job) => job.rows.filter((row) => row.turnId === turnId));
    let rejected = false;
    const parsed = [
      ...new Map(
        [...stored, ...queued].map((row) => [`${row.id}/${row.revision}`, row]),
      ).values(),
    ].flatMap((row) => {
      try {
        return [fromFeedRow(sessionId, row)];
      } catch (error) {
        rejected = true;
        rejectedShapes += 1;
        console.error(
          `sessions: rejected live-header shape #${rejectedShapes}`,
          error,
        );
        return [];
      }
    });
    return {
      rows: Object.fromEntries(
        newestRows(
          [...parsed, ...Object.values(rows)].filter(
            (row) => row.turnId === turnId,
          ),
        ),
      ),
      rejected,
    };
  };
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

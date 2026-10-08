import { runningToolCallStatuses, type SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { ActorRefFrom } from 'xstate';
import {
  decodeStoredFeedRow,
  fromFeedRow,
  newestRows,
  storedFeedColumns,
} from '../feed/feed-row';
import { type FeedRowWrite, queuedFeedRows } from '../feed/writer-job';
import type { writerMachine } from '../feed/writer-machine';

type LiveHeaderRowsReader = (input: {
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  sessionId: string;
  turnId: string | null;
  rows: Record<string, SessionUpdate>;
}) => { rows: Record<string, SessionUpdate>; rejected: boolean };

// Settled thoughts and retry Notices still inform the header after leaving Feed memory.
export function createLiveHeaderRowsReader({
  database,
}: {
  database: Database;
}): LiveHeaderRowsReader {
  let rejectedShapes = 0;
  return ({
    writer,
    sessionId,
    turnId,
    rows,
  }): ReturnType<LiveHeaderRowsReader> => {
    if (turnId === null) return { rows: {}, rejected: false };
    const stored = readStoredHeaderRows({ database, sessionId, turnId });
    const storedRows = new Set(stored);
    const queued = queuedFeedRows(
      writer?.getSnapshot().context.queue ?? [],
      sessionId,
    ).flatMap((job): FeedRowWrite[] =>
      job.rows.filter((row): boolean => row.turnId === turnId),
    );
    let rejected = false;
    const parsed = [
      ...new Map(
        [...stored, ...queued].map((row): [string, FeedRowWrite] => [
          `${row.id}/${row.revision}`,
          row,
        ]),
      ).values(),
    ].flatMap((row): SessionUpdate[] => {
      try {
        return [
          fromFeedRow(
            sessionId,
            storedRows.has(row) ? decodeStoredFeedRow(row) : row,
          ),
        ];
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
            (row): boolean => row.turnId === turnId,
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
    .select(storedFeedColumns)
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.turnId, turnId)))
    .orderBy(desc(feedRow.revision))
    .limit(1)
    .all();
  const thought = database
    .select(storedFeedColumns)
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
    .filter((row): boolean => row.turnId === turnId);
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
  const invalid = alias(feedRow, 'invalid_header_row');
  const newestInvalid = database
    .select({ position: invalid.position })
    .from(invalid)
    .where(
      and(
        eq(invalid.sessionId, sessionId),
        eq(invalid.sessionUpdate, 'tool_call_update'),
        eq(invalid.turnId, turnId),
        gt(invalid.position, sql`coalesce((${previousTool}), -1)`),
        sql`not json_valid(${invalid.payload})`,
      ),
    )
    .orderBy(desc(invalid.position))
    .limit(1);
  const tools = database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'tool_call_update'),
        eq(feedRow.turnId, turnId),
        gt(feedRow.position, sql`coalesce((${previousTool}), -1)`),
        sql`case when json_valid(${feedRow.payload})
          then json_extract(${feedRow.payload}, '$.status') in (${sql.join(
            runningToolCallStatuses.map(
              (status): import('drizzle-orm').SQL<unknown> => sql`${status}`,
            ),
            sql`, `,
          )}) else ${feedRow.position} = (${newestInvalid}) end`,
      ),
    )
    .orderBy(desc(feedRow.position))
    .all();
  return [...latest, ...thought, ...tools];
}

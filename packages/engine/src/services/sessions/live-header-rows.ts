import { runningToolCallStatuses, type SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, gt, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { ActorRefFrom } from 'xstate';
import { createRejectionCounter } from '../../lib/count-rejections';
import { hydrateStoredFeedRow, newestRows, storedFeedColumns } from '../feed';
import { type FeedRowWrite, readWriterProjection } from '../feed';
import type { writerMachine } from '../feed';

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
  const rejections = createRejectionCounter('sessions');
  return ({
    writer,
    sessionId,
    turnId,
    rows,
  }): ReturnType<LiveHeaderRowsReader> => {
    if (turnId === null) return { rows: {}, rejected: false };
    const stored = readStoredHeaderRows({ database, sessionId, turnId });
    const queued = readWriterProjection(writer)
      .feed(sessionId)
      .rows.filter((row): boolean => row.turnId === turnId);
    let rejected = false;
    // A row still in Feed memory is newer than its stored copy, so the stored payload is not parsed again.
    const parsed = [
      ...new Map(
        [...stored, ...queued]
          .filter((row): boolean => !Object.hasOwn(rows, row.id))
          .map((row): [string, FeedRowWrite | SessionUpdate] => [
            `${row.id}/${row.revision}`,
            row,
          ]),
      ).values(),
    ].flatMap((row): SessionUpdate[] => {
      if (!('payloadVersion' in row)) return [row];
      try {
        return [hydrateStoredFeedRow(sessionId, row)];
      } catch (error) {
        rejected = true;
        rejections.report('rejected live-header shape', error);
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
              (status): SQL<unknown> => sql`${status}`,
            ),
            sql`, `,
          )}) else ${feedRow.position} = (${newestInvalid}) end`,
      ),
    )
    .orderBy(desc(feedRow.position))
    .all();
  return [...latest, ...thought, ...tools];
}

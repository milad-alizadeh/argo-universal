import { runningToolCallStatuses } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import {
  decodeStoredFeedRow,
  fromFeedRow,
  payloadVersion,
  storedFeedColumns,
} from '../services/feed/feed-row';

// Repairs the database before the Engine serves; any failure rolls back the whole repair.
export function recoverAfterRestart(database: Database): void {
  const runningStatus = sql`case when json_valid(${feedRow.payload}) then json_extract(${feedRow.payload}, '$.status') in (${sql.join(
    runningToolCallStatuses.map(
      (status): import('drizzle-orm').SQL<unknown> => sql`${status}`,
    ),
    sql`, `,
  )}) else 0 end`;
  void database.transaction((transaction): void => {
    transaction
      .update(turn)
      .set({
        status: 'ended',
        stopReason: 'error',
        error: {
          code: 'interrupted',
          message: 'The Server stopped during the Turn',
        },
        endedAt: Date.now(),
      })
      .where(eq(turn.status, 'running'))
      .run();

    const rows = transaction
      .select({ row: storedFeedColumns, maxRevision: session.maxRevision })
      .from(feedRow)
      .innerJoin(session, eq(feedRow.sessionId, session.id))
      .where(
        or(
          eq(feedRow.state, 'open'),
          and(
            eq(feedRow.sessionUpdate, 'tool_call_update'),
            or(runningStatus, sql`not json_valid(${feedRow.payload})`),
          ),
        ),
      )
      .orderBy(feedRow.sessionId, feedRow.position)
      .all();

    const revisions = new Map<string, number>();
    let rejectedShapes = 0;
    for (const { row, maxRevision } of rows) {
      try {
        fromFeedRow(row.sessionId, decodeStoredFeedRow(row));
      } catch (error) {
        rejectedShapes += 1;
        console.error(
          `recovery: rejected Feed shape #${rejectedShapes} (${row.sessionId}/${row.id})`,
          {
            error,
            payloadVersion: row.payloadVersion,
            expectedPayloadVersion: payloadVersion,
          },
        );
      }

      const revision = (revisions.get(row.sessionId) ?? maxRevision) + 1;
      revisions.set(row.sessionId, revision);
      transaction
        .update(feedRow)
        .set({
          state: 'settled',
          revision,
          payload: sql`case
            when ${feedRow.sessionUpdate} = 'tool_call_update'
              and ${runningStatus}
            then json_set(${feedRow.payload}, '$.status', 'failed')
            else ${feedRow.payload} end`,
        })
        .where(
          and(eq(feedRow.sessionId, row.sessionId), eq(feedRow.id, row.id)),
        )
        .run();
    }
    for (const [sessionId, maxRevision] of revisions)
      transaction
        .update(session)
        .set({ maxRevision, activityAt: Date.now() })
        .where(eq(session.id, sessionId))
        .run();
  });
}

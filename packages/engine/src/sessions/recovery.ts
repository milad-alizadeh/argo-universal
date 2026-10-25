import { runningToolCallStatuses } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import {
  advanceRecoveredSession,
  recoverStoredFeedRow,
  restartTurnError,
  settleStoredTurn,
  storedFeedColumns,
} from '../feed';

// Repairs the database before the Engine serves; any failure rolls back the whole repair.
export function recoverAfterRestart(database: Database): void {
  const runningStatus = sql`case when json_valid(${feedRow.payload}) then json_extract(${feedRow.payload}, '$.status') in (${sql.join(
    runningToolCallStatuses.map((status): SQL<unknown> => sql`${status}`),
    sql`, `,
  )}) else 0 end`;

  database.transaction((transaction): void => {
    const endedAt = Date.now();

    const ended = transaction
      .update(turn)
      .set({
        status: 'ended',
        stopReason: 'error',
        error: restartTurnError,
        endedAt,
      })
      .where(eq(turn.status, 'running'))
      .returning({
        id: turn.id,
        sessionId: turn.sessionId,
        startedAt: turn.startedAt,
      })
      .all();

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
    const rejections = createRejectionCounter('recovery');

    for (const { row, maxRevision } of rows) {
      revisions.set(
        row.sessionId,
        recoverStoredFeedRow(transaction, {
          row,
          maxRevision: revisions.get(row.sessionId) ?? maxRevision,
          rejections,
        }),
      );
    }

    for (const [sessionId, maxRevision] of revisions)
      advanceRecoveredSession(transaction, sessionId, maxRevision);

    for (const row of ended)
      settleStoredTurn(transaction, {
        sessionId: row.sessionId,
        turnId: row.id,
        ending: {
          kind: 'engine_restart',
          turnEnd: {
            stopReason: 'error',
            error: restartTurnError,
            durationMs: Math.max(0, endedAt - row.startedAt),
          },
        },
      });
  });
}

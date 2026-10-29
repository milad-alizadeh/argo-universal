import { runningToolCallStatuses } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core';
import {
  advanceRecoveredSession,
  recoverStoredFeedRow,
  restartTurnError,
  settleStoredTurn,
  storedFeedColumns,
} from '../feed';
import type { StorageTransaction } from '../storage';

const runningToolStatus = (): SQL =>
  sql`case when json_valid(${feedRow.payload}) then json_extract(${feedRow.payload}, '$.status') in (${sql.join(
    runningToolCallStatuses.map((status): SQL<unknown> => sql`${status}`),
    sql`, `,
  )}) else 0 end`;

const recoverableRows = (): SQL | undefined =>
  or(
    eq(feedRow.state, 'open'),
    and(
      eq(feedRow.sessionUpdate, 'tool_call_update'),
      or(runningToolStatus(), sql`not json_valid(${feedRow.payload})`),
    ),
  );

type EndedTurn = Pick<
  typeof turn.$inferSelect,
  'id' | 'sessionId' | 'startedAt'
>;

type RecoveryRow = {
  row: Parameters<typeof recoverStoredFeedRow>[1]['row'];
  maxRevision: number;
};

const endedValues = (endedAt: number): SQLiteUpdateSetSource<typeof turn> => ({
  status: 'ended',
  stopReason: 'error',
  error: restartTurnError,
  endedAt,
});

const endedColumns = {
  id: turn.id,
  sessionId: turn.sessionId,
  startedAt: turn.startedAt,
};

const endRunningTurns = (
  transaction: StorageTransaction,
  endedAt: number,
): EndedTurn[] =>
  transaction
    .update(turn)
    .set(endedValues(endedAt))
    .where(eq(turn.status, 'running'))
    .returning(endedColumns)
    .all();

const readRecoveryRows = (transaction: StorageTransaction): RecoveryRow[] =>
  transaction
    .select({ row: storedFeedColumns, maxRevision: session.maxRevision })
    .from(feedRow)
    .innerJoin(session, eq(feedRow.sessionId, session.id))
    .where(recoverableRows())
    .orderBy(feedRow.sessionId, feedRow.position)
    .all();

type RecoveryState = {
  revisions: Map<string, number>;
  rejections: ReturnType<typeof createRejectionCounter>;
};

function recoverRow(
  transaction: StorageTransaction,
  { row, maxRevision }: RecoveryRow,
  state: RecoveryState,
): void {
  state.revisions.set(
    row.sessionId,
    recoverStoredFeedRow(transaction, {
      row,
      maxRevision: state.revisions.get(row.sessionId) ?? maxRevision,
      rejections: state.rejections,
    }),
  );
}

function recoverRows(
  transaction: StorageTransaction,
  rows: RecoveryRow[],
): Map<string, number> {
  const state: RecoveryState = {
    revisions: new Map(),
    rejections: createRejectionCounter('recovery'),
  };

  for (const row of rows) recoverRow(transaction, row, state);

  return state.revisions;
}

const settlement = (
  row: EndedTurn,
  endedAt: number,
): Parameters<typeof settleStoredTurn>[1] => ({
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

function repairTransaction(transaction: StorageTransaction): void {
  const endedAt = Date.now();
  const ended = endRunningTurns(transaction, endedAt);
  const revisions = recoverRows(transaction, readRecoveryRows(transaction));

  for (const [sessionId, maxRevision] of revisions)
    advanceRecoveredSession(transaction, sessionId, maxRevision);

  for (const row of ended)
    settleStoredTurn(transaction, settlement(row, endedAt));
}

// Repairs the database before the Engine serves; any failure rolls back the whole repair.
export function recoverAfterRestart(database: Database): void {
  database.transaction(repairTransaction);
}

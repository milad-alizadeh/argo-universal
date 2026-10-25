import type { SessionUpdate } from '@repo/contracts';
import { feedRow, session, turn } from '@repo/db/schema';
import type { createRejectionCounter } from '@repo/machine-log';
import { and, eq } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import type { Feed } from './feed-change';
import { nextFeedRevision } from './feed-revision';
import {
  hydrateStoredFeedRow,
  highestFeedPosition,
  payloadVersion,
  storedFeedColumns,
  toFeedRowWrite,
} from './feed-row';
import { writeFeedRowsInTransaction } from './feed-rows-write';
import { settleFeedTurn, type FeedTurnEnding } from './turn-settlement';

// The stored adapter of Turn settlement (see `turn-settlement.ts`): Engine restart and archive lend a transaction, and the rule's rows are written in it, never queued as a `FeedRowsJob`.

type SettledTurn = {
  sessionId: string;
  turnId: string;
  ending: FeedTurnEnding;
  // The Turn's stored rows; none when the ending only adds its marker.
  rows?: Feed['rows'];
};

const readStoredFeed = (
  transaction: StorageTransaction,
  sessionId: string,
  rows: Feed['rows'],
): Feed => {
  const stored = transaction
    .select({ maxRevision: session.maxRevision })
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

  if (!stored) throw new Error(`No Session ${sessionId} to settle a Turn in`);

  return {
    sessionId,
    maxRevision: stored.maxRevision,
    nextPosition: highestFeedPosition(transaction, sessionId) + 1,
    rows,
  };
};

// Settles one Turn of a stored Session and writes the rows it changed.
export const settleStoredTurn = (
  transaction: StorageTransaction,
  { sessionId, turnId, ending, rows = {} }: SettledTurn,
): void => {
  const result = settleFeedTurn(
    readStoredFeed(transaction, sessionId, rows),
    turnId,
    ending,
  );

  if ('rejection' in result) throw new Error(result.rejection);

  writeFeedRowsInTransaction(transaction, {
    sessionId,
    rows: Object.values(result.feed.rows),
    maxRevision: result.feed.maxRevision,
  });
};

const runningTurnRows = (
  transaction: StorageTransaction,
  sessionId: string,
): Map<string, Feed['rows']> => {
  const stored = transaction
    .select(storedFeedColumns)
    .from(feedRow)
    .innerJoin(turn, eq(feedRow.turnId, turn.id))
    .where(and(eq(feedRow.sessionId, sessionId), eq(turn.status, 'running')))
    .all();

  const byTurn = new Map<string, Feed['rows']>();

  for (const row of stored) {
    const rows = byTurn.get(row.turnId ?? '') ?? {};

    rows[row.id] = hydrateStoredFeedRow(sessionId, row);
    byTurn.set(row.turnId ?? '', rows);
  }

  return byTurn;
};

// Borrowed Checkouts have no Session actor: archive lends the Writer's transaction to Feed.
export function settleArchivedChild(
  transaction: StorageTransaction,
  sessionId: string,
): void {
  for (const [turnId, rows] of runningTurnRows(transaction, sessionId))
    settleStoredTurn(transaction, {
      sessionId,
      turnId,
      ending: { kind: 'cancel' },
      rows,
    });
}

type StoredFeedRow = Omit<
  typeof feedRow.$inferSelect,
  'payload' | 'sourceRef'
> & {
  payload: unknown;
  sourceRef: unknown;
};

type RecoveryRow = {
  row: StoredFeedRow;
  maxRevision: number;
  rejections: ReturnType<typeof createRejectionCounter>;
};

type RepairedRow = Pick<typeof feedRow.$inferInsert, 'state' | 'revision'> &
  Partial<Pick<typeof feedRow.$inferInsert, 'payload' | 'payloadVersion'>>;

const readRecoveryRow = (input: RecoveryRow): SessionUpdate | undefined => {
  try {
    return hydrateStoredFeedRow(input.row.sessionId, input.row);
  } catch (error) {
    input.rejections.report(
      `rejected Feed shape (${input.row.sessionId}/${input.row.id})`,
      {
        error,
        payloadVersion: input.row.payloadVersion,
        expectedPayloadVersion: payloadVersion,
      },
    );

    return undefined;
  }
};

const recoveryFeed = (input: RecoveryRow, row: SessionUpdate): Feed => ({
  sessionId: row.sessionId,
  maxRevision: input.maxRevision,
  nextPosition: row.position + 1,
  rows: { [row.id]: row },
});

const recoveryRowWrite = (row: SessionUpdate): RepairedRow => {
  const written = toFeedRowWrite(row);

  return {
    state: written.state,
    revision: written.revision,
    payload: written.payload,
    payloadVersion: written.payloadVersion,
  };
};

const settleReadableRow = (
  input: RecoveryRow,
  row: SessionUpdate,
): RepairedRow => {
  const result = settleFeedTurn(recoveryFeed(input, row), row.turnId, {
    kind: 'engine_restart',
  });

  if ('rejection' in result) throw new Error(result.rejection);
  const settled = result.feed.rows[row.id];

  if (!settled) throw new Error(`Recovery lost Feed row ${row.id}`);

  return recoveryRowWrite(settled);
};

const repairRow = (input: RecoveryRow): RepairedRow => {
  const row = readRecoveryRow(input);

  return row
    ? settleReadableRow(input, row)
    : { state: 'settled', revision: nextFeedRevision(input.maxRevision) };
};

// Startup lends its transaction; accepted rows use the live rule, rejected bytes remain untouched.
export const recoverStoredFeedRow = (
  transaction: StorageTransaction,
  input: RecoveryRow,
): number => {
  const repaired = repairRow(input);

  transaction
    .update(feedRow)
    .set(repaired)
    .where(
      and(
        eq(feedRow.sessionId, input.row.sessionId),
        eq(feedRow.id, input.row.id),
      ),
    )
    .run();

  return repaired.revision;
};

// Startup calls this once per Session, after all of its rows are repaired.
export const advanceRecoveredSession = (
  transaction: StorageTransaction,
  sessionId: string,
  maxRevision: number,
): void => {
  writeFeedRowsInTransaction(transaction, { sessionId, rows: [], maxRevision });
};

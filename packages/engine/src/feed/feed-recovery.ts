import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import type { createRejectionCounter } from '@repo/machine-log';
import { and, eq } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import type { Feed } from './feed-change';
import { nextFeedRevision } from './feed-revision';
import {
  hydrateStoredFeedRow,
  payloadVersion,
  toFeedRowWrite,
} from './feed-row';
import { FeedRowsJob } from './feed-rows-job';
import { settleFeedTurn } from './turn-settlement';

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

const recoveryRowWrite = (row: SessionUpdate): RepairedRow => {
  const written = toFeedRowWrite(row);

  return {
    state: written.state,
    revision: written.revision,
    payload: written.payload,
    payloadVersion: written.payloadVersion,
  };
};

const repairRow = (input: RecoveryRow): RepairedRow => {
  const row = readRecoveryRow(input);

  return row
    ? settleReadableRow(input, row)
    : { state: 'settled', revision: nextFeedRevision(input.maxRevision) };
};

const writeRepairedRow = (
  transaction: StorageTransaction,
  row: StoredFeedRow,
  repaired: RepairedRow,
): void => {
  transaction
    .update(feedRow)
    .set(repaired)
    .where(and(eq(feedRow.sessionId, row.sessionId), eq(feedRow.id, row.id)))
    .run();
};

const advanceRecoveredSession = (
  transaction: StorageTransaction,
  sessionId: string,
  maxRevision: number,
): void => {
  new FeedRowsJob({ sessionId, rows: [], maxRevision }).commit(transaction);
};

// Startup lends its transaction; accepted rows use the live rule, rejected bytes remain untouched.
export const recoverStoredFeedRow = (
  transaction: StorageTransaction,
  input: RecoveryRow,
): number => {
  const repaired = repairRow(input);
  writeRepairedRow(transaction, input.row, repaired);
  advanceRecoveredSession(transaction, input.row.sessionId, repaired.revision);

  return repaired.revision;
};

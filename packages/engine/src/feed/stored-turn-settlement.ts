import { feedRow, session, turn } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import type { Feed } from './feed-change';
import {
  highestFeedPosition,
  hydrateStoredFeedRow,
  storedFeedColumns,
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

const readMaxRevision = (
  transaction: StorageTransaction,
  sessionId: string,
): number => {
  const stored = transaction
    .select({ maxRevision: session.maxRevision })
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

  if (!stored) throw new Error(`No Session ${sessionId} to settle a Turn in`);

  return stored.maxRevision;
};

const readStoredFeed = (
  transaction: StorageTransaction,
  sessionId: string,
  rows: Feed['rows'],
): Feed => ({
  sessionId,
  maxRevision: readMaxRevision(transaction, sessionId),
  nextPosition: highestFeedPosition(transaction, sessionId) + 1,
  rows,
});

// Settles one Turn of a stored Session and writes the rows it changed.
export const settleStoredTurn = (
  transaction: StorageTransaction,
  { sessionId, turnId, ending, rows = {} }: SettledTurn,
): void => {
  const feed = readStoredFeed(transaction, sessionId, rows);
  const result = settleFeedTurn(feed, turnId, ending);

  if ('rejection' in result) throw new Error(result.rejection);
  writeFeedRowsInTransaction(transaction, {
    sessionId,
    rows: Object.values(result.feed.rows),
    maxRevision: result.feed.maxRevision,
  });
};

type StoredRow = Parameters<typeof hydrateStoredFeedRow>[1];

const byTurn = (
  sessionId: string,
  stored: StoredRow[],
): Map<string, Feed['rows']> => {
  const turns = new Map<string, Feed['rows']>();

  for (const row of stored) {
    const turnId = row.turnId ?? '';

    turns.set(turnId, {
      ...turns.get(turnId),
      [row.id]: hydrateStoredFeedRow(sessionId, row),
    });
  }

  return turns;
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

  return byTurn(sessionId, stored);
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

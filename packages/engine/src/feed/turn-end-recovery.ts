import type { TurnEnd } from '@repo/contracts';
import { feedRow, session } from '@repo/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import { applyFeedChange, type Feed } from './feed-change';
import { writeFeedRowsInTransaction } from './feed-rows-write';
import { turnEndChange } from './turn-end';

type EndedTurn = { sessionId: string; turnId: string; end: TurnEnd };

const nextPosition = (
  transaction: StorageTransaction,
  sessionId: string,
): number => {
  const last = transaction
    .select({ position: feedRow.position })
    .from(feedRow)
    .where(eq(feedRow.sessionId, sessionId))
    .orderBy(desc(feedRow.position))
    .limit(1)
    .get();

  return (last?.position ?? -1) + 1;
};

const readRevision = (
  transaction: StorageTransaction,
  sessionId: string,
): number => {
  const stored = transaction
    .select({ maxRevision: session.maxRevision })
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

  if (!stored) throw new Error(`No Session ${sessionId} for recovered Turn`);

  return stored.maxRevision;
};

const recoveryFeed = (
  transaction: StorageTransaction,
  sessionId: string,
): Feed => ({
  sessionId,
  maxRevision: readRevision(transaction, sessionId),
  nextPosition: nextPosition(transaction, sessionId),
  rows: {},
});

const endedFeed = (transaction: StorageTransaction, ended: EndedTurn): Feed => {
  const result = applyFeedChange(
    recoveryFeed(transaction, ended.sessionId),
    turnEndChange(ended.turnId, ended.end),
    ended.turnId,
  );

  if ('rejection' in result) throw new Error(result.rejection);

  return result.feed;
};

// Startup uses the same Feed marker, revision and write path as a live ending.
export const recoverTurnEnd = (
  transaction: StorageTransaction,
  ended: EndedTurn,
): void => {
  const feed = endedFeed(transaction, ended);

  writeFeedRowsInTransaction(transaction, {
    sessionId: ended.sessionId,
    rows: Object.values(feed.rows),
    maxRevision: feed.maxRevision,
  });
};

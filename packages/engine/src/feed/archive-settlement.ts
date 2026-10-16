import { feedRow, session, turn } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import type { Feed } from './feed-change';
import { hydrateStoredFeedRow, storedFeedColumns } from './feed-row';
import { writeFeedRowsInTransaction } from './feed-rows-write';
import { settleFeedTurn } from './turn-settlement';

const childRows = (
  transaction: StorageTransaction,
  sessionId: string,
): Feed['rows'] => {
  const rows = transaction
    .select(storedFeedColumns)
    .from(feedRow)
    .innerJoin(turn, eq(feedRow.turnId, turn.id))
    .where(and(eq(feedRow.sessionId, sessionId), eq(turn.status, 'running')))
    .all();

  return Object.fromEntries(
    rows.map((row) => [row.id, hydrateStoredFeedRow(sessionId, row)]),
  );
};

const childFeed = (
  transaction: StorageTransaction,
  sessionId: string,
): Feed => ({
  sessionId,
  nextPosition: 0,
  maxRevision:
    transaction
      .select({ revision: session.maxRevision })
      .from(session)
      .where(eq(session.id, sessionId))
      .get()?.revision ?? 0,
  rows: childRows(transaction, sessionId),
});

const cancelTurn = (feed: Feed, turnId: string | null): Feed => {
  const result = settleFeedTurn(feed, turnId, { kind: 'cancel' });

  if ('rejection' in result) throw new Error(result.rejection);

  return result.feed;
};

// Borrowed Checkouts have no Session actor: archive lends the Writer's transaction to Feed.
export function settleArchivedChild(
  transaction: StorageTransaction,
  sessionId: string,
): void {
  let feed = childFeed(transaction, sessionId);
  const turns = new Set(Object.values(feed.rows).map((row) => row.turnId));

  for (const turnId of turns) feed = cancelTurn(feed, turnId);

  writeFeedRowsInTransaction(transaction, {
    sessionId,
    rows: Object.values(feed.rows),
    maxRevision: feed.maxRevision,
  });
}

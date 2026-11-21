import type { Database } from '@repo/db';
import {
  closedFollowThrough,
  delegatedTurn,
  feedRow,
  turn,
} from '@repo/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  hydrateStoredFeedRow,
  messageText,
  storedFeedColumns,
} from '../../feed';
import type { StorageTransaction, WriterJob } from '../../storage';

const pending = and(
  eq(delegatedTurn.delivered, false),
  eq(delegatedTurn.revoked, false),
);

export function settledDelegations(database: Database) {
  return database
    .select({
      work: delegatedTurn,
      stopReason: turn.stopReason,
      error: turn.error,
    })
    .from(delegatedTurn)
    .innerJoin(
      turn,
      and(
        eq(turn.id, delegatedTurn.turnId),
        eq(turn.sessionId, delegatedTurn.sourceId),
      ),
    )
    .where(and(pending, eq(turn.status, 'ended')))
    .orderBy(turn.endedAt, delegatedTurn.id)
    .all();
}

export type SettledDelegation = ReturnType<typeof settledDelegations>[number];

const excerptLimit = 1600;

export function resultText(
  database: Database,
  { work, stopReason, error }: SettledDelegation,
): string {
  const last = database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, work.sourceId),
        eq(feedRow.turnId, work.turnId),
        eq(feedRow.sessionUpdate, 'agent_message'),
        eq(feedRow.state, 'settled'),
      ),
    )
    .orderBy(desc(feedRow.position))
    .get();

  const message = last && hydrateStoredFeedRow(work.sourceId, last);

  return JSON.stringify({
    sourceSessionId: work.sourceId,
    turnId: work.turnId,
    stopReason,
    error,
    messageId: last?.id,
    excerpt:
      message?.sessionUpdate === 'agent_message'
        ? messageText(message.content).slice(0, excerptLimit)
        : undefined,
  });
}

export function delivered(ids: string[]): WriterJob {
  return {
    describe: () => 'Record delegated Turn delivery',
    commit: (tx) => {
      tx.update(delegatedTurn)
        .set({ delivered: true })
        .where(inArray(delegatedTurn.id, ids))
        .run();
    },
  };
}

export function revokeDelegations(
  tx: StorageTransaction,
  starterIds: string[],
): void {
  tx.insert(closedFollowThrough)
    .select(
      tx
        .select({ turnId: turn.id })
        .from(turn)
        .where(inArray(turn.sessionId, starterIds)),
    )
    .onConflictDoNothing()
    .run();
  tx.update(delegatedTurn)
    .set({ revoked: true })
    .where(inArray(delegatedTurn.starterId, starterIds))
    .run();
}

export function closeFollowThrough(starterId: string): WriterJob {
  return {
    describe: () => 'Close delegated follow-through',
    commit: (tx) => revokeDelegations(tx, [starterId]),
  };
}

export function allowsResult(
  database: Database,
  starterId: string,
  ids: string[],
): boolean {
  const rows = database
    .select({ id: delegatedTurn.id })
    .from(delegatedTurn)
    .where(
      and(
        eq(delegatedTurn.starterId, starterId),
        eq(delegatedTurn.revoked, false),
        inArray(delegatedTurn.id, ids),
      ),
    )
    .all();

  return rows.length === ids.length;
}

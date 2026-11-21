import {
  closedFollowThrough,
  delegatedTurn,
  session,
  turn,
} from '@repo/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import type { FeedRowsWrite } from './feed-rows-write';

// Record the Turn that actually received the Prompt, including acknowledged steering.
export function recordDelegatedTurns(
  tx: StorageTransaction,
  { sessionId, rows }: FeedRowsWrite,
): void {
  for (const row of rows) {
    if (row.sessionUpdate !== 'prompt_message' || !row.turnId) continue;
    const { sender } = row._meta.argo;

    if (sender.type !== 'session' || !sender.followThrough) continue;
    const starter = tx
      .select({ id: session.id })
      .from(session)
      .innerJoin(turn, eq(turn.sessionId, session.id))
      .where(
        and(
          eq(session.id, sender.sessionId),
          eq(turn.id, sender.followThrough),
          sql`not exists (select 1 from ${closedFollowThrough} where ${closedFollowThrough.turnId} = ${turn.id})`,
          isNull(session.archivedAt),
        ),
      )
      .get();

    if (!starter) continue;
    tx.insert(delegatedTurn)
      .values({
        id: JSON.stringify([starter.id, sessionId, row.turnId]),
        starterId: starter.id,
        sourceId: sessionId,
        turnId: row.turnId,
      })
      .onConflictDoNothing()
      .run();
  }
}

import { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';

const payloadObject = z.record(z.string(), z.unknown());

// Repairs the database before the Engine serves; any failure rolls back the whole repair.
export function recoverAfterRestart(database: Database) {
  database.transaction((transaction) => {
    transaction
      .update(turn)
      .set({ status: 'ended', stopReason: 'error', endedAt: Date.now() })
      .where(eq(turn.status, 'running'))
      .run();

    const rows = transaction
      .select({ row: feedRow, maxRevision: session.maxRevision })
      .from(feedRow)
      .innerJoin(session, eq(feedRow.sessionId, session.id))
      .where(
        or(
          eq(feedRow.state, 'open'),
          and(
            eq(feedRow.sessionUpdate, 'tool_call_update'),
            sql`json_extract(${feedRow.payload}, '$.status') in ('pending', 'in_progress')`,
          ),
        ),
      )
      .orderBy(feedRow.sessionId, feedRow.position)
      .all();

    const revisions = new Map<string, number>();
    const unrecognisedRows: string[] = [];
    for (const { row, maxRevision } of rows) {
      const payload = payloadObject.safeParse(row.payload);
      const update = payload.success
        ? SessionUpdate.safeParse({
            ...payload.data,
            id: row.id,
            sessionId: row.sessionId,
            position: row.position,
            revision: row.revision,
            turnId: row.turnId,
            state: row.state,
            sessionUpdate: row.sessionUpdate,
          })
        : null;
      if (!payload.success || !update?.success || row.payloadVersion !== 1) {
        unrecognisedRows.push(`${row.sessionId}/${row.id}`);
        continue;
      }

      const revision = (revisions.get(row.sessionId) ?? maxRevision) + 1;
      revisions.set(row.sessionId, revision);
      const toolFailed =
        update.data.sessionUpdate === 'tool_call_update' &&
        (update.data.status === 'pending' ||
          update.data.status === 'in_progress');
      transaction
        .update(feedRow)
        .set({
          state: 'settled',
          revision,
          ...(toolFailed
            ? { payload: { ...payload.data, status: 'failed' } }
            : {}),
        })
        .where(
          and(eq(feedRow.sessionId, row.sessionId), eq(feedRow.id, row.id)),
        )
        .run();
    }
    if (unrecognisedRows.length > 0)
      throw new Error(
        `unrecognised Feed rows: ${unrecognisedRows.length} (${unrecognisedRows.join(', ')})`,
      );

    for (const [sessionId, maxRevision] of revisions)
      transaction
        .update(session)
        .set({ maxRevision })
        .where(eq(session.id, sessionId))
        .run();
  });
}

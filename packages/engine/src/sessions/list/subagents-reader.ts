import {
  SessionRecord,
  Subagent,
  type SessionUpdate,
  type SubagentUpdate,
  type Turn,
} from '@repo/contracts';
import { feedRow, session, turn } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  hydrateStoredFeedRow,
  newestRows,
  readQueuedFeed,
  storedFeedColumns,
  type FeedDeps,
} from '../../feed';
import { decodeStoredTurn } from './stored-turn';
import { toSubagents } from './subagents';

type SubagentDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

// #83 writes child Sessions and maps ACP ids to Argo ids; this reader only projects existing rows.
export function createSubagentsReader(
  deps: SubagentDeps,
): (sessionId: string) => Subagent[] {
  const rejections = createRejectionCounter('sessions');

  return (sessionId): Subagent[] => {
    const children = deps.database
      .select({
        id: session.id,
        parentSessionId: session.parentSessionId,
        title: session.title,
      })
      .from(session)
      .where(eq(session.parentSessionId, sessionId))
      .all();

    if (children.length === 0) return [];

    const updates = readSubagentUpdates(deps, sessionId, rejections);

    return children.flatMap((row): Subagent[] => {
      try {
        const child = SessionRecord.pick({
          id: true,
          parentSessionId: true,
          title: true,
        }).parse(row);

        return toSubagents(
          [child],
          readLatestTurn(deps, child.id),
          updates,
        ).map((value): Subagent => Subagent.parse(value));
      } catch (error) {
        rejections.report('rejected Subagent shape', error);

        return [];
      }
    });
  };
}

function readLatestTurn(deps: SubagentDeps, sessionId: string): Turn[] {
  return deps.database
    .select({
      id: turn.id,
      sessionId: turn.sessionId,
      status: turn.status,
      stopReason: turn.stopReason,
      model: turn.model,
      startedAt: turn.startedAt,
      endedAt: turn.endedAt,
      usage: sql<unknown>`${turn.usage}`,
      error: sql<unknown>`${turn.error}`,
    })
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(desc(turn.startedAt), desc(turn.id))
    .limit(1)
    .all()
    .map(decodeStoredTurn);
}

function readSubagentUpdates(
  deps: SubagentDeps,
  sessionId: string,
  rejections: ReturnType<typeof createRejectionCounter>,
): SubagentUpdate[] {
  const stored = deps.database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'subagent_update'),
      ),
    )
    .all()
    .flatMap((row): SessionUpdate[] => {
      try {
        return [hydrateStoredFeedRow(sessionId, row)];
      } catch (error) {
        rejections.report('rejected Subagent shape', error);

        return [];
      }
    });

  return [
    ...newestRows([
      ...stored,
      ...readQueuedFeed(deps.findWriter(), sessionId).rows,
      ...Object.values(
        deps.findFeed(sessionId)?.getSnapshot().context.rows ?? {},
      ),
    ]).values(),
  ].filter(
    (
      row,
    ): row is Extract<SessionUpdate, { sessionUpdate: 'subagent_update' }> =>
      row.sessionUpdate === 'subagent_update',
  );
}

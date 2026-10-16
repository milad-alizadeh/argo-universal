import {
  SessionRecord,
  Subagent,
  type SessionUpdate,
  type SubagentUpdate,
  type Turn,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { session, feedRow, turn } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { and, desc, eq } from 'drizzle-orm';
import {
  hydrateStoredFeedRow,
  newestRows,
  readQueuedFeed,
  storedFeedColumns,
  type FeedDeps,
  type FeedRowWrite,
} from '../../feed';
import { decodeStoredTurn, storedTurnColumns } from '../turns';
import { toSubagents } from './subagents';

type SubagentDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

type ChildRow = Pick<SessionRecord, 'id' | 'parentSessionId' | 'title'>;

export function createSubagentsReader(
  deps: SubagentDeps,
): (sessionId: string) => Subagent[] {
  const reader = new SubagentsReader(deps);

  return (sessionId): Subagent[] => reader.read(sessionId);
}

class SubagentsReader {
  private readonly rejections = createRejectionCounter('sessions');
  public constructor(private readonly deps: SubagentDeps) {}

  public read(sessionId: string): Subagent[] {
    const children = this.deps.database
      .select({
        id: session.id,
        parentSessionId: session.parentSessionId,
        title: session.title,
      })
      .from(session)
      .where(eq(session.parentSessionId, sessionId))
      .all();

    if (children.length === 0) return [];
    const updates = this.updates(sessionId);

    return children.flatMap((row): Subagent[] => this.child(row, updates));
  }

  private child(row: ChildRow, updates: SubagentUpdate[]): Subagent[] {
    try {
      const child = childSession.parse(row);

      return toSubagents(
        [child],
        readLatestTurn(this.deps.database, child.id),
        updates,
      ).map((value): Subagent => Subagent.parse(value));
    } catch (error) {
      this.rejections.report('rejected Subagent shape', error);

      return [];
    }
  }

  private updates(sessionId: string): SubagentUpdate[] {
    const stored = this.storedUpdates(sessionId);
    const queued = readQueuedFeed(this.deps.findWriter(), sessionId).rows;

    const live =
      this.deps.findFeed(sessionId)?.getSnapshot().context.rows ?? {};

    return [
      ...newestRows([...stored, ...queued, ...Object.values(live)]).values(),
    ].filter(
      (row): row is SubagentUpdate => row.sessionUpdate === 'subagent_update',
    );
  }

  private storedUpdates(sessionId: string): SessionUpdate[] {
    return this.deps.database
      .select(storedFeedColumns)
      .from(feedRow)
      .where(
        and(
          eq(feedRow.sessionId, sessionId),
          eq(feedRow.sessionUpdate, 'subagent_update'),
        ),
      )
      .all()
      .flatMap((row): SessionUpdate[] => this.hydrate(sessionId, row));
  }

  private hydrate(sessionId: string, row: FeedRowWrite): SessionUpdate[] {
    try {
      return [hydrateStoredFeedRow(sessionId, row)];
    } catch (error) {
      this.rejections.report('rejected Subagent shape', error);

      return [];
    }
  }
}

const childSession = SessionRecord.pick({
  id: true,
  parentSessionId: true,
  title: true,
});

function readLatestTurn(database: Database, sessionId: string): Turn[] {
  return database
    .select(storedTurnColumns)
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(desc(turn.startedAt), desc(turn.id))
    .limit(1)
    .all()
    .map(decodeStoredTurn);
}

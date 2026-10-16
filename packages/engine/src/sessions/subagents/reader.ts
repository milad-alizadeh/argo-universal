import {
  Subagent,
  type SessionRecord,
  type SessionUpdate,
  type SubagentUpdate,
} from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { and, eq } from 'drizzle-orm';
import {
  readFeedRows,
  storedFeedColumns,
  type FeedDeps,
  type FeedRowWrite,
} from '../../feed';
import { readLatestTurn, type RowSources } from '../session-storage';
import { readChildSessions, type ChildSessionRead } from './children';
import { toSubagent } from './subagents';

type SubagentDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

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
    const sources = {
      database: this.deps.database,
      writer: this.deps.findWriter(),
    };

    const children = readChildSessions(sources, sessionId);

    if (children.length === 0) return [];
    const updates = this.updates(sessionId);

    return children.flatMap((read): Subagent[] =>
      this.child(sources, read, updates),
    );
  }

  private child(
    sources: RowSources,
    read: ChildSessionRead,
    updates: SubagentUpdate[],
  ): Subagent[] {
    try {
      const child = read();

      return child ? readSubagent(sources, child, updates) : [];
    } catch (error) {
      this.rejections.report('rejected Subagent shape', error);

      return [];
    }
  }

  private updates(sessionId: string): SubagentUpdate[] {
    const { rows, rejected } = readFeedRows(this.deps, sessionId, {
      stored: this.storedUpdates(sessionId),
      keep: isSubagentUpdate,
    });

    for (const error of rejected)
      this.rejections.report('rejected Subagent shape', error);

    return rows;
  }

  private storedUpdates(sessionId: string): FeedRowWrite[] {
    return this.deps.database
      .select(storedFeedColumns)
      .from(feedRow)
      .where(
        and(
          eq(feedRow.sessionId, sessionId),
          eq(feedRow.sessionUpdate, 'subagent_update'),
        ),
      )
      .all();
  }
}

function readSubagent(
  sources: RowSources,
  child: SessionRecord,
  updates: SubagentUpdate[],
): Subagent[] {
  return toSubagent(child, readLatestTurn(sources, child.id), updates).map(
    (value): Subagent => Subagent.parse(value),
  );
}

const isSubagentUpdate = (row: SessionUpdate): row is SubagentUpdate =>
  row.sessionUpdate === 'subagent_update';

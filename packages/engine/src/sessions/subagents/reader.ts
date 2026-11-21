import {
  Subagent,
  type SessionRecord,
  type SessionUpdate,
  type SubagentUpdate,
  type Turn,
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
import { readLatestTurns, type RowSources } from '../session-storage';
import { readChildSessions } from './children';
import { type ChildSession, toSubagent } from './subagent-view';

type SubagentDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

type SubagentFamily = {
  children: readonly ChildSession[];
  latestTurn: (sessionId: string) => Turn | undefined;
};

export function createSubagentsReader(
  deps: SubagentDeps,
): (sessionId: string, family?: SubagentFamily) => Subagent[] {
  const reader = new SubagentsReader(deps);

  return (sessionId, family): Subagent[] => reader.read(sessionId, family);
}

class SubagentsReader {
  private readonly rejections = createRejectionCounter('sessions');
  public constructor(private readonly deps: SubagentDeps) {}

  public read(
    sessionId: string,
    family = this.readFamily(sessionId),
  ): Subagent[] {
    const { children, latestTurn } = family;

    return children.length
      ? this.subagents(children, latestTurn, this.updates(sessionId))
      : [];
  }

  private readFamily(sessionId: string): SubagentFamily {
    const sources = {
      database: this.deps.database,
      writer: this.deps.findWriter(),
    };

    const children = this.children(sources, sessionId);

    const latestTurn = children.length
      ? readLatestTurns(
          sources,
          children.map((child): string => child.id),
        )
      : (): undefined => undefined;

    return { children, latestTurn };
  }

  private subagents(
    children: readonly ChildSession[],
    latestTurn: (sessionId: string) => Turn | undefined,
    updates: SubagentUpdate[],
  ): Subagent[] {
    return children.flatMap((child): Subagent[] =>
      this.validate((): Subagent[] =>
        readSubagent(child, latestTurn(child.id), updates),
      ),
    );
  }

  private children(sources: RowSources, sessionId: string): SessionRecord[] {
    return readChildSessions(sources, sessionId).flatMap(
      (read): SessionRecord[] =>
        this.validate((): SessionRecord[] => present(read())),
    );
  }

  // One child's rows; a child whose Session or latest Turn fails its shape is refused alone.
  private validate<Value>(read: () => Value[]): Value[] {
    try {
      return read();
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
  child: ChildSession,
  latest: Turn | undefined,
  updates: SubagentUpdate[],
): Subagent[] {
  return toSubagent(child, latest, updates).map((value): Subagent =>
    Subagent.parse(value),
  );
}

const present = <Value>(value: Value | undefined): Value[] =>
  value === undefined ? [] : [value];

const isSubagentUpdate = (row: SessionUpdate): row is SubagentUpdate =>
  row.sessionUpdate === 'subagent_update';

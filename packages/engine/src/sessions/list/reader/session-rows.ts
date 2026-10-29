import { SessionRecord } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { inArray, or, type SQL } from 'drizzle-orm';
import {
  storedSessionColumns,
  decodeStoredSession,
} from '../../session-record';
import {
  readQueuedSessionRows,
  type QueuedSessionRows,
} from '../../session-storage/session-storage';
import type { ListReadInput } from './input';
import { shellCountColumns } from './shell-counts';

type StoredSession = typeof session.$inferSelect & {
  shellTotal: number;
  shellRunning: number;
};

export function readListSessions(
  input: ListReadInput,
  sessionIds?: readonly string[],
): SessionRecord[] {
  const projection = readQueuedSessionRows(input.writer);

  const stored = storedSessions(input, sessionIds);
  rememberShellCounts(input, stored);

  const rows = new Map(
    stored.map((row): [string, typeof row] => [row.id, row]),
  );

  const ids = new Set([...rows.keys(), ...projection.sessionIds(sessionIds)]);

  return [...ids].flatMap((id): SessionRecord[] =>
    projectedSession({ input, projection, rows, id }),
  );
}

function storedSessions(
  input: ListReadInput,
  sessionIds: readonly string[] | undefined,
): StoredSession[] {
  return input.database
    .select({ ...storedSessionColumns, ...shellCountColumns(input.database) })
    .from(session)
    .where(sessionFilter(sessionIds))
    .all();
}

type ProjectedSessionInput = {
  input: ListReadInput;
  projection: QueuedSessionRows;
  rows: Map<string, typeof session.$inferSelect>;
  id: string;
};

function projectedSession({
  input,
  projection,
  rows,
  id,
}: ProjectedSessionInput): SessionRecord[] {
  const row = input.validate((): ReturnType<typeof projection.session> => {
    const stored = rows.get(id);

    return projection.session(
      stored && SessionRecord.parse(decodeStoredSession(stored)),
      id,
    );
  });

  return row ? [row] : [];
}

function sessionFilter(ids: readonly string[] | undefined): SQL | undefined {
  return ids
    ? or(
        inArray(session.id, ids),
        inArray(session.parentSessionId, ids),
        inArray(session.startedBySessionId, ids),
      )
    : undefined;
}

function rememberShellCounts(
  input: ListReadInput,
  stored: StoredSession[],
): void {
  for (const row of stored)
    input.shellCounts.set(row.id, {
      total: row.shellTotal,
      running: row.shellRunning,
    });
}

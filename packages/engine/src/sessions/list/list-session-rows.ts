import { SessionRecord } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { inArray, or, type SQL } from 'drizzle-orm';
import { storedSessionColumns, decodeStoredSession } from '../session-record';
import {
  readQueuedSessionRows,
  type QueuedSessionRows,
} from '../session-storage';
import type { ListReadInput } from './list-read-input';

export function readListSessions(
  input: ListReadInput,
  sessionIds?: readonly string[],
): SessionRecord[] {
  const projection = readQueuedSessionRows(input.writer);

  const stored = storedSessions(input, sessionIds);

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
): (typeof session.$inferSelect)[] {
  return input.database
    .select(storedSessionColumns)
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
    ? or(inArray(session.id, ids), inArray(session.parentSessionId, ids))
    : undefined;
}

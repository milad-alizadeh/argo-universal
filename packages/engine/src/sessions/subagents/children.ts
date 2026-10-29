import { SessionRecord } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq, or, type SQL } from 'drizzle-orm';
import { decodeStoredSession, storedSessionColumns } from '../session-record';
import { readQueuedSessionRows, type RowSources } from '../session-storage';

type StoredSession = typeof session.$inferSelect;

// Decodes one child Session; it throws when that child's row fails its shape, so the caller refuses only that child.
type ChildSessionRead = () => SessionRecord | undefined;

// A parent's child Sessions as the Writer will leave them: stored children and queued inserts, with the queued Session jobs replayed over each.
export function readChildSessions(
  sources: RowSources,
  parentId: string,
): ChildSessionRead[] {
  const stored = storedChildren(sources, parentId);
  const queued = readQueuedSessionRows(sources.writer);
  const ids = new Set([...stored.keys(), ...queued.sessionIds([parentId])]);

  return [...ids].map(
    (id): ChildSessionRead =>
      (): SessionRecord | undefined =>
        childOf(queued.session(decode(stored.get(id)), id), parentId),
  );
}

const storedChildren = (
  { database }: RowSources,
  parentId: string,
): Map<string, StoredSession> =>
  new Map(
    database
      .select(storedSessionColumns)
      .from(session)
      .where(childFilter(parentId))
      .all()
      .map((row): [string, StoredSession] => [row.id, row]),
  );

const decode = (row: StoredSession | undefined): SessionRecord | undefined =>
  row && SessionRecord.parse(decodeStoredSession(row));

const childOf = (
  row: SessionRecord | undefined,
  parentId: string,
): SessionRecord | undefined =>
  row && parentOf(row, parentId) ? row : undefined;

function parentOf(row: SessionRecord, parentId: string): boolean {
  return (
    row.parentSessionId === parentId || row.startedBySessionId === parentId
  );
}

function childFilter(parentId: string): SQL | undefined {
  return or(
    eq(session.parentSessionId, parentId),
    eq(session.startedBySessionId, parentId),
  );
}

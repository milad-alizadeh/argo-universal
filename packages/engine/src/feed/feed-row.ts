import { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, eq, getTableColumns, max, sql } from 'drizzle-orm';
import { z } from 'zod';

export { outputBlobsOf, promptBlobIds } from './row-blobs';

export type FeedRowWrite = Omit<
  typeof feedRow.$inferInsert,
  'sessionId' | 'createdAt' | 'updatedAt'
>;

export const storedFeedColumns = {
  ...getTableColumns(feedRow),
  payload: sql<unknown>`${feedRow.payload}`,
  sourceRef: sql<unknown>`${feedRow.sourceRef}`,
};

// The highest `position` a Session's stored rows hold, -1 when it has none.
export const highestFeedPosition = (
  database: Pick<Database, 'select'>,
  sessionId: string,
): number =>
  database
    .select({ highest: max(feedRow.position) })
    .from(feedRow)
    .where(eq(feedRow.sessionId, sessionId))
    .get()?.highest ?? -1;

// The shape version of `payload` in the rows this Server writes.
export const payloadVersion = 1;

// A row as the `feed_row` table stores it: the envelope in columns, the rest in `payload`.
function rowPayload(row: SessionUpdate): FeedRowWrite['payload'] {
  const fields = new Set(['sessionId', ...Object.keys(rowEnvelope(row))]);

  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !fields.has(key)),
  );
}

type RowEnvelope = Pick<
  SessionUpdate,
  'id' | 'position' | 'revision' | 'turnId' | 'state' | 'sessionUpdate'
>;

function rowEnvelope(row: Pick<FeedRowWrite, keyof RowEnvelope>): RowEnvelope {
  return {
    id: row.id,
    position: row.position,
    revision: row.revision,
    turnId: row.turnId ?? null,
    state: row.state,
    sessionUpdate: row.sessionUpdate,
  };
}

export function toFeedRowWrite(row: SessionUpdate): FeedRowWrite {
  return { ...rowEnvelope(row), payload: rowPayload(row), payloadVersion };
}

// A row from another payload version, or with an unreadable source reference, fails.
function checkStoredRow(row: FeedRowWrite): void {
  if (row.payloadVersion !== payloadVersion)
    throw new Error(
      `row ${row.id} has payload version ${row.payloadVersion}, not ${payloadVersion}`,
    );
  JSON.parse(z.string().nullish().parse(row.sourceRef) ?? 'null');
}

// A stored row as a Session update, checked against its kind; a row from another payload version, or with envelope fields in its payload, fails.
export function hydrateStoredFeedRow(
  sessionId: string,
  row: FeedRowWrite,
): SessionUpdate {
  checkStoredRow(row);
  const envelope = { ...rowEnvelope(row), sessionId };

  const payload = z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(z.string().parse(row.payload)));

  const clash = Object.keys(payload).find((key): boolean =>
    Object.hasOwn(envelope, key),
  );

  if (clash) throw new Error(`row ${row.id} has ${clash} in its payload`);

  return SessionUpdate.parse({ ...payload, ...envelope });
}

// The newest version of a row the feed actor handed to the database writer, queued or stored.
type WrittenRowRead = {
  database: Database;
  pending: SessionUpdate | undefined;
  sessionId: string;
  id: string;
};

export function readWrittenRow({
  database,
  pending,
  sessionId,
  id,
}: WrittenRowRead): SessionUpdate | undefined {
  if (pending) return pending;

  const stored = database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.id, id)))
    .get();

  return stored && hydrateStoredFeedRow(sessionId, stored);
}

// Higher revision wins; a tie goes to the later input (stored, queued, then in memory).
export function newestRows(
  rows: Iterable<SessionUpdate>,
): Map<string, SessionUpdate> {
  const newest = new Map<string, SessionUpdate>();

  for (const row of rows) retainNewestRow(newest, row);

  return newest;
}

function retainNewestRow(
  newest: Map<string, SessionUpdate>,
  row: SessionUpdate,
): void {
  const known = newest.get(row.id);

  if (!known || row.revision >= known.revision) newest.set(row.id, row);
}

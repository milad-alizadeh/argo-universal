import { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { OutputBlob } from './acp/tool-output';

export type FeedRowWrite = Omit<
  typeof feedRow.$inferInsert,
  'sessionId' | 'createdAt' | 'updatedAt'
>;

export const storedFeedColumns = {
  ...getTableColumns(feedRow),
  payload: sql<unknown>`${feedRow.payload}`,
  sourceRef: sql<unknown>`${feedRow.sourceRef}`,
};

// The shape version of `payload` in the rows this Server writes.
export const payloadVersion = 1;

// The blobs that the prompt rows among `rows` show, each once.
export const promptBlobIds = (rows: readonly SessionUpdate[]): string[] => [
  ...new Set(
    rows.flatMap((row): string[] =>
      row.sessionUpdate === 'user_message'
        ? row.content.flatMap((block): string[] =>
            block.type === 'image' ? [block.blob.blobId] : [],
          )
        : [],
    ),
  ),
];

// The waiting whole outputs the rows still show; an output a later update replaced is not stored.
export const outputBlobsOf = (
  rows: readonly SessionUpdate[],
  blobs: readonly OutputBlob[],
): OutputBlob[] => {
  const shown = new Set(
    rows.flatMap((row): string[] =>
      row.sessionUpdate === 'tool_call_update'
        ? Object.values(row._meta?.argo?.fullOutput ?? {}).map(
            (blob): string => blob.blobId,
          )
        : [],
    ),
  );
  return [
    ...new Map(
      blobs
        .filter((blob): boolean => shown.has(blob.blob.blobId))
        .map((blob): [string, OutputBlob] => [blob.blob.blobId, blob]),
    ).values(),
  ];
};

// A row as the `feed_row` table stores it: the envelope in columns, the rest in `payload`.
export function toFeedRowWrite(row: SessionUpdate): FeedRowWrite {
  const {
    id,
    sessionId,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    ...payload
  } = row;
  return {
    id,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    payload,
    payloadVersion,
  };
}

// A stored row as a Session update, checked against its kind; a row from another payload version, or with envelope fields in its payload, fails.
export function hydrateStoredFeedRow(
  sessionId: string,
  row: FeedRowWrite,
): SessionUpdate {
  if (row.payloadVersion !== payloadVersion)
    throw new Error(
      `row ${row.id} has payload version ${row.payloadVersion}, not ${payloadVersion}`,
    );
  JSON.parse(String(row.sourceRef ?? null));
  const envelope = {
    id: row.id,
    sessionId,
    position: row.position,
    revision: row.revision,
    turnId: row.turnId ?? null,
    state: row.state,
    sessionUpdate: row.sessionUpdate,
  };
  const payload = z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(String(row.payload)));
  const clash = Object.keys(payload).find((key): boolean =>
    Object.hasOwn(envelope, key),
  );
  if (clash) throw new Error(`row ${row.id} has ${clash} in its payload`);
  return SessionUpdate.parse({ ...payload, ...envelope });
}

// The newest version of a row the feed actor handed to the database writer, queued or stored.
export function readWrittenRow({
  database,
  pending,
  sessionId,
  id,
}: {
  database: Database;
  pending: SessionUpdate | undefined;
  sessionId: string;
  id: string;
}): SessionUpdate | undefined {
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
  for (const row of rows) {
    const known = newest.get(row.id);
    if (!known || row.revision >= known.revision) newest.set(row.id, row);
  }
  return newest;
}

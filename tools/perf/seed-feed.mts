import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { feedRow, turn } from '@repo/db/schema';
import { sessionUpdateKinds } from '@repo/db/schema';
import { z } from 'zod';

// Copies of the recorded Feeds in `mocks/app/feed-recordings.json`, as rows of one long Session.
const rowSchema = z.looseObject({
  id: z.string(),
  sessionUpdate: z.enum(sessionUpdateKinds),
  turnId: z.string().nullable(),
});

type RecordedRow = z.infer<typeof rowSchema>;

const recordingsSchema = z.array(z.looseObject({ rows: z.array(rowSchema) }));

// Fields the row's columns hold; the rest is its payload.
const columnFields = new Set([
  'id',
  'sessionId',
  'position',
  'revision',
  'turnId',
  'state',
  'sessionUpdate',
]);

const renamedIds = /"(id|toolCallId|messageId|turnId)":"([^"]+)"/gu;

const recordingsPath = path.resolve(
  import.meta.dirname,
  '../../mocks/app/feed-recordings.json',
);

// Each recording's rows, without images whose blobs the seeded home does not hold.
async function recordings(): Promise<RecordedRow[][]> {
  const recorded = recordingsSchema.parse(
    JSON.parse(await readFile(recordingsPath, 'utf8')),
  );

  return recorded.map((recording) =>
    recording.rows.filter((row) => !JSON.stringify(row).includes('"blobId"')),
  );
}

// Renames every id a copy carries, so copies never share a tool call, message or Turn.
const copyRow = (row: RecordedRow, prefix: string): RecordedRow =>
  rowSchema.parse(
    JSON.parse(
      JSON.stringify(row).replaceAll(
        renamedIds,
        (_match, key: string, value: string) => `"${key}":"${prefix}${value}"`,
      ),
    ),
  );

// A recorded row's fields that no column holds.
type RecordedPayload = Omit<RecordedRow, 'id' | 'sessionUpdate' | 'turnId'>;

const payloadOf = (row: RecordedRow): RecordedPayload =>
  Object.fromEntries(
    Object.entries(row).filter(([key]) => !columnFields.has(key)),
  );

export interface SeededFeed {
  turns: (typeof turn.$inferInsert)[];
  rows: (typeof feedRow.$inferInsert)[];
}

// One ended Turn for each Turn the rows belong to.
const endedTurns = (
  sessionId: string,
  rows: readonly RecordedRow[],
  now: number,
): SeededFeed['turns'] =>
  [...new Set(rows.flatMap((row) => row.turnId ?? []))].map((id) => ({
    id,
    sessionId,
    status: 'ended',
    stopReason: 'end_turn',
    startedAt: now - 1000,
    endedAt: now - 500,
  }));

const settledRow = (
  sessionId: string,
  row: RecordedRow,
  position: number,
): SeededFeed['rows'][number] => ({
  sessionId,
  position,
  id: row.id,
  sessionUpdate: row.sessionUpdate,
  revision: position,
  turnId: row.turnId,
  state: 'settled',
  payload: payloadOf(row),
  payloadVersion: 1,
});

// One prefix per copy of a recording, so a copied Turn keeps all of its rows.
const copiedRows = (
  recorded: readonly RecordedRow[][],
  copies: number,
): RecordedRow[] =>
  Array.from({ length: copies }, (_, copy) =>
    recorded.flatMap((rows, index) =>
      rows.map((row) => copyRow(row, `c${copy}r${index}-`)),
    ),
  ).flat();

// `copies` copies of every recorded row for `sessionId`, with the ended Turns they belong to.
export async function seededFeed(
  sessionId: string,
  copies: number,
  now: number,
): Promise<SeededFeed> {
  const copied = copiedRows(await recordings(), copies);

  return {
    turns: endedTurns(sessionId, copied, now),
    rows: copied.map((row, index) => settledRow(sessionId, row, index + 1)),
  };
}

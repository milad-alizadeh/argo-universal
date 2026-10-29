import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sessionUpdateKinds } from '@repo/db/schema';
import { z } from 'zod';

// Copies of the recorded Feeds in `mocks/app/feed-recordings.json`, as rows of one long Session.
const rowSchema = z.looseObject({
  id: z.string(),
  sessionUpdate: z.enum(sessionUpdateKinds),
  turnId: z.string().nullable(),
});

export type RecordedRow = z.infer<typeof rowSchema>;

const recordingsSchema = z.array(z.looseObject({ rows: z.array(rowSchema) }));

const renamedIds = /"(id|toolCallId|messageId|turnId)":"([^"]+)"/gu;

const recordingsPath = path.resolve(
  import.meta.dirname,
  '../../mocks/app/feed-recordings.json',
);

// Each recording's rows, without images whose blobs the seeded home does not hold.
export async function recordings(): Promise<RecordedRow[][]> {
  const recorded = recordingsSchema.parse(
    JSON.parse(await readFile(recordingsPath, 'utf8')),
  );

  return recorded.map((recording) =>
    recording.rows.filter((row) => !JSON.stringify(row).includes('"blobId"')),
  );
}

// Renames every id a copy carries, so copies never share a tool call, message or Turn.
export const copyRow = (row: RecordedRow, prefix: string): RecordedRow =>
  rowSchema.parse(
    JSON.parse(
      JSON.stringify(row).replaceAll(
        renamedIds,
        (_match, key: string, value: string) => `"${key}":"${prefix}${value}"`,
      ),
    ),
  );

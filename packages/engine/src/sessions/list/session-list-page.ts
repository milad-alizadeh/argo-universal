import type {
  SessionInfo,
  SessionListInput,
  SessionListOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { jsonCodec } from '../../lib/json-codec';

// Where a row sits in the list: its creation time, then its id.
const cursorSchema = jsonCodec(
  z.strictObject({ createdAt: z.int(), sessionId: z.string() }),
);

type Cursor = z.infer<typeof cursorSchema>;

const pageSize = 50;

// Sessions page newest created first.
export function sessionListPage(
  input: SessionListInput,
  readRows: () => SessionInfo[],
): SessionListOutput {
  // A malformed cursor is rejected before any row is read.
  const cursor = parseCursor(input.cursor);

  const matching = readRows()
    .filter(
      (row): boolean => matchesInput(row, input) && afterCursor(row, cursor),
    )
    .sort(compareRows);

  const page = matching.slice(0, pageSize);

  return { sessions: page, nextCursor: nextCursor(matching, page.at(-1)) };
}

function parseCursor(cursor: string | undefined): Cursor | undefined {
  if (cursor === undefined) return undefined;

  const parsed = cursorSchema.safeParse(
    Buffer.from(cursor, 'base64url').toString('utf8'),
  );

  if (parsed.success) return parsed.data;

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Invalid Session list cursor',
  });
}

function matchesInput(row: SessionInfo, input: SessionListInput): boolean {
  return (
    matchesProject(row, input) &&
    matchesArchived(row, input.archived) &&
    matchesQuery(row, input.query)
  );
}

function matchesArchived(
  row: SessionInfo,
  archived: boolean | undefined,
): boolean {
  return archived === undefined || (row.archivedAt !== null) === archived;
}

function matchesProject(row: SessionInfo, input: SessionListInput): boolean {
  return input.projectId === undefined || row.projectId === input.projectId;
}

function matchesQuery(row: SessionInfo, query: string | undefined): boolean {
  return (
    query === undefined ||
    row.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
}

function afterCursor(row: SessionInfo, cursor: Cursor | undefined): boolean {
  return !cursor || compareRows(cursor, row) < 0;
}

// Newest created first; ties break by `sessionId`, highest first.
function compareRows(first: Cursor, second: Cursor): number {
  return (
    second.createdAt - first.createdAt ||
    compareIds(first.sessionId, second.sessionId)
  );
}

function compareIds(first: string, second: string): number {
  if (first < second) return 1;

  return first > second ? -1 : 0;
}

function nextCursor(
  rows: SessionInfo[],
  last: SessionInfo | undefined,
): string | null {
  return rows.length > pageSize && last
    ? Buffer.from(
        z.encode(cursorSchema, {
          createdAt: last.createdAt,
          sessionId: last.sessionId,
        }),
      ).toString('base64url')
    : null;
}

import {
  type SessionInfo,
  type SessionListInput,
  SessionListOrder,
  type SessionListOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { jsonCodec } from '../../lib/json-codec';

// Where a row sits in its order: that order's time, then its id.
const placeSchema = z.strictObject({
  at: z.int(),
  sessionId: z.string(),
});

type Place = z.infer<typeof placeSchema>;

// A cursor names the order it pages, so a page asked for in another order is rejected rather than misplaced.
const cursorSchema = jsonCodec(placeSchema.extend({ order: SessionListOrder }));

type Cursor = z.infer<typeof cursorSchema>;

const pageSize = 50;

// Each order's time; newest first.
const orderTimes = {
  activity: (row: SessionInfo): number => row.activityAt,
  created: (row: SessionInfo): number => row.createdAt,
} satisfies Record<SessionListOrder, (row: SessionInfo) => number>;

export function sessionListPage(
  input: SessionListInput,
  readRows: () => SessionInfo[],
): SessionListOutput {
  const order = input.order ?? 'activity';
  // A malformed cursor is rejected before any row is read.
  const cursor = parseCursor(input.cursor, order);
  const rows = readRows().filter((row): boolean => matchesInput(row, input));
  const matching = rowsAfter(cursor, place(order), rows);
  const page = matching.slice(0, pageSize);

  return {
    sessions: page,
    nextCursor: nextCursor(matching, order, page.at(-1)),
  };
}

// The rows after the cursor, in its order.
function rowsAfter(
  cursor: Cursor | undefined,
  placeOf: (row: SessionInfo) => Place,
  rows: SessionInfo[],
): SessionInfo[] {
  return rows
    .filter((row): boolean => afterCursor(placeOf(row), cursor))
    .sort((first, second) => comparePlaces(placeOf(first), placeOf(second)));
}

function parseCursor(
  cursor: string | undefined,
  order: SessionListOrder,
): Cursor | undefined {
  if (cursor === undefined) return undefined;

  return cursorFor(order, decodeCursor(cursor));
}

function decodeCursor(cursor: string): Cursor | undefined {
  return cursorSchema.safeParse(
    Buffer.from(cursor, 'base64url').toString('utf8'),
  ).data;
}

function cursorFor(
  order: SessionListOrder,
  cursor: Cursor | undefined,
): Cursor {
  if (cursor !== undefined && cursor.order === order) return cursor;

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

const place =
  (order: SessionListOrder) =>
  (row: SessionInfo): Place => ({
    at: orderTimes[order](row),
    sessionId: row.sessionId,
  });

function afterCursor(rowPlace: Place, cursor: Cursor | undefined): boolean {
  return !cursor || comparePlaces(cursor, rowPlace) < 0;
}

// Newest first; ties break by `sessionId`, highest first.
function comparePlaces(first: Place, second: Place): number {
  return second.at - first.at || compareIds(first.sessionId, second.sessionId);
}

function compareIds(first: string, second: string): number {
  if (first < second) return 1;

  return first > second ? -1 : 0;
}

function nextCursor(
  rows: SessionInfo[],
  order: SessionListOrder,
  last: SessionInfo | undefined,
): string | null {
  return rows.length > pageSize && last
    ? Buffer.from(
        z.encode(cursorSchema, { order, ...place(order)(last) }),
      ).toString('base64url')
    : null;
}

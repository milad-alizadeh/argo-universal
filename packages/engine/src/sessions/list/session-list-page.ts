import type {
  SessionInfo,
  SessionListInput,
  SessionListOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { jsonCodec } from '../../lib/json-codec';

const cursorSchema = jsonCodec(
  z.strictObject({
    activityAt: z.int(),
    sessionId: z.string(),
  }),
);

const pageSize = 50;

export function sessionListPage(
  input: SessionListInput,
  readRows: () => SessionInfo[],
): SessionListOutput {
  const cursor = parseCursor(input.cursor);

  const matching = readRows()
    .filter(
      (row): boolean => matchesInput(row, input) && beforeCursor(row, cursor),
    )
    .sort(compareRows);

  const page = matching.slice(0, pageSize);

  return { sessions: page, nextCursor: nextCursor(matching, page.at(-1)) };
}

function parseCursor(
  cursor: string | undefined,
): z.infer<typeof cursorSchema> | undefined {
  if (cursor === undefined) return undefined;

  try {
    return cursorSchema.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid Session list cursor',
    });
  }
}

function matchesInput(row: SessionInfo, input: SessionListInput): boolean {
  return (
    matchesProject(row, input) &&
    (row.archivedAt !== null) === input.archived &&
    matchesQuery(row, input.query)
  );
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

function beforeCursor(
  row: SessionInfo,
  cursor: z.infer<typeof cursorSchema> | undefined,
): boolean {
  if (!cursor) return true;

  return row.activityAt < cursor.activityAt || sameActivityBefore(row, cursor);
}

function sameActivityBefore(
  row: SessionInfo,
  cursor: z.infer<typeof cursorSchema>,
): boolean {
  return (
    row.activityAt === cursor.activityAt && row.sessionId < cursor.sessionId
  );
}

function compareRows(first: SessionInfo, second: SessionInfo): number {
  const activityOrder = second.activityAt - first.activityAt;

  return activityOrder || compareIds(first.sessionId, second.sessionId);
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
          activityAt: last.activityAt,
          sessionId: last.sessionId,
        }),
      ).toString('base64url')
    : null;
}

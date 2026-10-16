import { runningToolCallStatuses } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, gt, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { storedFeedColumns, type FeedRowWrite } from '../../../feed';

type HeaderQuery = { database: Database; sessionId: string; turnId: string };

export function readStoredHeaderRows(input: HeaderQuery): FeedRowWrite[] {
  return [...latestRows(input), ...thoughtRows(input), ...toolRows(input)];
}

function latestRows(input: HeaderQuery): FeedRowWrite[] {
  const { database, sessionId, turnId } = input;

  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.turnId, turnId)))
    .orderBy(desc(feedRow.revision))
    .limit(1)
    .all();
}

function thoughtRows(input: HeaderQuery): FeedRowWrite[] {
  const { database, sessionId, turnId } = input;

  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(thoughtFilter(sessionId))
    .orderBy(desc(feedRow.position))
    .limit(1)
    .all()
    .filter((row): boolean => row.turnId === turnId);
}

function previousTool(input: HeaderQuery): SQL {
  const { database, sessionId, turnId } = input;

  const query = database
    .select({ position: feedRow.position })
    .from(feedRow)
    .where(previousToolFilter(sessionId, turnId))
    .orderBy(desc(feedRow.position))
    .limit(1);

  return sql`(${query})`;
}

function newestInvalid(input: HeaderQuery): SQL {
  const { database } = input;
  const invalid = alias(feedRow, 'invalid_header_row');

  const query = database
    .select({ position: invalid.position })
    .from(invalid)
    .where(invalidFilter(input, invalid))
    .orderBy(desc(invalid.position))
    .limit(1);

  return sql`(${query})`;
}

function toolRows(input: HeaderQuery): FeedRowWrite[] {
  const { database } = input;

  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(toolFilter(input))
    .orderBy(desc(feedRow.position))
    .all();
}

function thoughtFilter(sessionId: string): SQL | undefined {
  return and(
    eq(feedRow.sessionId, sessionId),
    eq(feedRow.sessionUpdate, 'agent_thought'),
  );
}

function previousToolFilter(
  sessionId: string,
  turnId: string,
): SQL | undefined {
  return and(
    eq(feedRow.sessionId, sessionId),
    eq(feedRow.sessionUpdate, 'tool_call_update'),
    or(ne(feedRow.turnId, turnId), isNull(feedRow.turnId)),
  );
}

function invalidAlias(): ReturnType<
  typeof alias<typeof feedRow, 'invalid_header_row'>
> {
  return alias(feedRow, 'invalid_header_row');
}

function invalidFilter(
  input: HeaderQuery,
  invalid: ReturnType<typeof invalidAlias>,
): SQL | undefined {
  const { sessionId, turnId } = input;

  return and(
    eq(invalid.sessionId, sessionId),
    eq(invalid.sessionUpdate, 'tool_call_update'),
    eq(invalid.turnId, turnId),
    gt(invalid.position, sql`coalesce(${previousTool(input)}, -1)`),
    sql`not json_valid(${invalid.payload})`,
  );
}

function toolFilter(input: HeaderQuery): SQL | undefined {
  return and(
    eq(feedRow.sessionId, input.sessionId),
    eq(feedRow.sessionUpdate, 'tool_call_update'),
    eq(feedRow.turnId, input.turnId),
    gt(feedRow.position, sql`coalesce(${previousTool(input)}, -1)`),
    runningToolFilter(input),
  );
}

function runningToolFilter(input: HeaderQuery): SQL {
  return sql`case when json_valid(${feedRow.payload})
    then json_extract(${feedRow.payload}, '$.status') in (${runningStatuses()})
    else ${feedRow.position} = ${newestInvalid(input)} end`;
}

function runningStatuses(): SQL {
  return sql.join(
    runningToolCallStatuses.map((status): SQL<unknown> => sql`${status}`),
    sql`, `,
  );
}

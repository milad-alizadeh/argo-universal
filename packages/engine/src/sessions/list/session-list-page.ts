import type {
  SessionInfo,
  SessionListInput,
  SessionListOutput,
} from '@repo/contracts';
import {
  encodeListCursor,
  parseListCursor,
  sessionListTime,
  type SessionListCursor,
  type SessionListTime,
} from './session-list-cursor';

const pageSize = 50;

export function sessionListPage(
  input: SessionListInput,
  readRows: () => SessionInfo[],
): SessionListOutput {
  const cursor = parseListCursor(input);
  const matching = matchingRows(input, readRows(), cursor);
  const page = matching.slice(0, pageSize);

  return {
    sessions: page,
    nextCursor: nextCursor(matching, page.at(-1), sessionListTime(input)),
  };
}

function matchingRows(
  input: SessionListInput,
  rows: SessionInfo[],
  cursor: SessionListCursor | undefined,
): SessionInfo[] {
  const field = sessionListTime(input);

  return rows
    .filter(
      (row) => matchesInput(row, input) && beforeCursor(row, cursor, field),
    )
    .sort((first, second) => compareRows(first, second, field));
}

function matchesInput(row: SessionInfo, input: SessionListInput): boolean {
  return (
    matchesProject(row, input) &&
    matchesArchive(row, input.archived) &&
    matchesQuery(row, input.query)
  );
}

function matchesArchive(
  row: SessionInfo,
  archived: SessionListInput['archived'],
): boolean {
  return archived === 'all' || (row.archivedAt !== null) === archived;
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
  cursor: SessionListCursor | undefined,
  field: SessionListTime,
): boolean {
  if (!cursor) return true;

  return row[field] < cursor.at || sameTimeBefore(row, cursor, field);
}

function sameTimeBefore(
  row: SessionInfo,
  cursor: SessionListCursor,
  field: SessionListTime,
): boolean {
  return row[field] === cursor.at && row.sessionId < cursor.sessionId;
}

function compareRows(
  first: SessionInfo,
  second: SessionInfo,
  field: SessionListTime,
): number {
  return (
    second[field] - first[field] ||
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
  field: SessionListTime,
): string | null {
  return rows.length > pageSize && last ? encodeListCursor(last, field) : null;
}

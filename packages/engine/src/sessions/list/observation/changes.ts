import type { SessionCounts, SessionListUpdate } from '@repo/contracts';
import type { SessionListState } from './machine';

type Listed = { row: SessionListState[number]; json: string };

/*
 * A row the list kept from the last read is the same object, so it is unchanged without being written out again.
 * Only a row read again is compared by its JSON, because reading it again may still give the same row.
 */
export function selectSessionChanges(): (
  state: SessionListState,
) => SessionListUpdate[] {
  let previous = new Map<string, Listed>();

  return (state): SessionListUpdate[] => {
    const next = listedRows(state, previous);
    const changed = changedSessions(state, previous, next);

    changed.push(...removedSessions(previous, next));
    previous = next;

    return changed;
  };
}

function listedRows(
  state: SessionListState,
  previous: Map<string, Listed>,
): Map<string, Listed> {
  return new Map(
    state.map((row): [string, Listed] => [
      row.information.sessionId,
      listed(row, previous.get(row.information.sessionId)),
    ]),
  );
}

function listed(row: SessionListState[number], before?: Listed): Listed {
  return before?.row === row
    ? before
    : { row, json: JSON.stringify(row.information) };
}

function changedSessions(
  rows: SessionListState,
  previous: Map<string, Listed>,
  next: Map<string, Listed>,
): SessionListUpdate[] {
  return rows
    .filter((row): boolean => isChanged(row, previous, next))
    .map((row): SessionListUpdate => ({
      type: 'changed',
      session: row.information,
    }));
}

function isChanged(
  row: SessionListState[number],
  previous: Map<string, Listed>,
  next: Map<string, Listed>,
): boolean {
  const { sessionId } = row.information;

  return previous.get(sessionId)?.json !== next.get(sessionId)?.json;
}

export function selectSessionCounts(): (
  rows: SessionListState,
) => SessionCounts[] {
  let previous = '';

  return (rows): SessionCounts[] => {
    const counts = countActiveSessions(rows);
    const serialized = JSON.stringify(counts);

    if (serialized === previous) return [];
    previous = serialized;

    return [counts];
  };
}

function countActiveSessions(rows: SessionListState): SessionCounts {
  const active = rows.filter(
    (row): boolean => row.information.archivedAt === null,
  );

  return {
    attention: active.filter(
      (row): boolean =>
        row.information.status === 'needs_input' ||
        row.information.status === 'unread',
    ).length,
    running: active.filter((row): boolean => row.running).length,
  };
}

function removedSessions(
  previous: Map<string, Listed>,
  next: Map<string, Listed>,
): SessionListUpdate[] {
  return [...previous.keys()].flatMap((sessionId): SessionListUpdate[] =>
    next.has(sessionId) ? [] : [{ type: 'removed', sessionId }],
  );
}

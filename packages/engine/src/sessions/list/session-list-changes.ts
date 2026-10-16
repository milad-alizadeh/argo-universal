import type {
  SessionCounts,
  SessionInfo,
  SessionListUpdate,
} from '@repo/contracts';
import type { SessionListState } from './session-list-machine';

export function selectSessionChanges(): (
  state: SessionListState,
) => SessionListUpdate[] {
  let previous = new Map<string, string>();

  return (state): SessionListUpdate[] => {
    const rows = state.map((row): SessionInfo => row.information);

    const next = new Map(
      rows.map((row): [string, string] => [row.sessionId, JSON.stringify(row)]),
    );

    const changed = changedSessions(rows, previous, next);

    changed.push(...removedSessions(previous, next));
    previous = next;

    return changed;
  };
}

function changedSessions(
  rows: SessionInfo[],
  previous: Map<string, string>,
  next: Map<string, string>,
): SessionListUpdate[] {
  return rows
    .values()
    .filter(
      (row): boolean => previous.get(row.sessionId) !== next.get(row.sessionId),
    )
    .map((row): SessionListUpdate => ({ type: 'changed', session: row }))
    .toArray();
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
  previous: Map<string, string>,
  next: Map<string, string>,
): SessionListUpdate[] {
  return [...previous.keys()].flatMap((sessionId): SessionListUpdate[] =>
    next.has(sessionId) ? [] : [{ type: 'removed', sessionId }],
  );
}

import type { SessionRecord } from '@repo/contracts';
import type { SessionRowSources } from './router-deps';
import { readLatestTurns } from './session-storage';
import { readOpenSession } from './session-system';
import { readChildSessions } from './subagents/children';

const startedChildren = (
  sources: Parameters<typeof readChildSessions>[0],
  callerId: string,
): SessionRecord[] =>
  readChildSessions(sources, callerId)
    .map((read) => read())
    .filter(
      (row): row is SessionRecord => row?.startedBySessionId === callerId,
    );

const isRunning = (
  deps: SessionRowSources,
  latest: ReturnType<typeof readLatestTurns>,
  sessionId: string,
): boolean => {
  const live = readOpenSession(deps.sessions, sessionId);

  return live
    ? live.activeTurnId !== null
    : latest(sessionId)?.status === 'running';
};

export function runningStartedSessions(
  deps: SessionRowSources,
  callerId: string,
): string[] {
  const sources = { database: deps.database, writer: deps.findWriter() };

  const children = startedChildren(sources, callerId);

  const latest = readLatestTurns(
    sources,
    children.map((child) => child.id),
  );

  return children
    .filter((child) => isRunning(deps, latest, child.id))
    .map((child) => child.id);
}

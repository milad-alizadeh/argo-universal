import type { SessionRecord } from '@repo/contracts';
import type { OpenSessions } from './open-sessions';
import { readLatestTurns } from './session-storage';
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
  open: OpenSessions,
  latest: ReturnType<typeof readLatestTurns>,
  sessionId: string,
): boolean => {
  const live = open.context(sessionId);

  return live
    ? live.activeTurnId !== null
    : latest(sessionId)?.status === 'running';
};

export function runningStartedSessions(
  open: OpenSessions,
  callerId: string,
): string[] {
  const sources = { database: open.database, writer: open.findWriter() };

  const children = startedChildren(sources, callerId);

  const latest = readLatestTurns(
    sources,
    children.map((child) => child.id),
  );

  return children
    .filter((child) => isRunning(open, latest, child.id))
    .map((child) => child.id);
}

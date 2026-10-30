import type { SessionRecord } from '@repo/contracts';
import type { HandlerSources } from './session-sources';
import { readLatestTurns } from './session-storage';
import { readChildSessions } from './subagents/children';

type DelegationSources = HandlerSources<'database' | 'findWriter', 'context'>;

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
  sources: DelegationSources,
  latest: ReturnType<typeof readLatestTurns>,
  sessionId: string,
): boolean => {
  const live = sources.open.context(sessionId);

  return live
    ? live.activeTurnId !== null
    : latest(sessionId)?.status === 'running';
};

export function runningStartedSessions(
  sources: DelegationSources,
  callerId: string,
): string[] {
  const rows = { database: sources.database, writer: sources.findWriter() };

  const children = startedChildren(rows, callerId);

  const latest = readLatestTurns(
    rows,
    children.map((child) => child.id),
  );

  return children
    .filter((child) => isRunning(sources, latest, child.id))
    .map((child) => child.id);
}

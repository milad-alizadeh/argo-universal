import type { SessionRecord } from '@repo/contracts';
import type { SessionRouterDeps } from './router-deps';
import { readLatestTurns } from './session-storage';
import { readChildSessions } from './subagents/children';

export function runningStartedSessions(
  deps: SessionRouterDeps,
  callerId: string,
): string[] {
  const sources = { database: deps.database, writer: deps.findWriter() };

  const children = readChildSessions(sources, callerId)
    .map((read) => read())
    .filter(
      (row): row is SessionRecord => row?.startedBySessionId === callerId,
    );

  const latest = readLatestTurns(
    sources,
    children.map((child) => child.id),
  );

  return children
    .filter((child) => {
      const actor = deps.sessions.getSnapshot().context.sessions[child.id];

      return actor
        ? actor.getSnapshot().context.activeTurnId !== null
        : latest(child.id)?.status === 'running';
    })
    .map((child) => child.id);
}

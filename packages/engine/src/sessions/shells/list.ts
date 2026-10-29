import type { SessionShellsOutput } from '@repo/contracts';
import type { SessionRouterDeps } from '../router-deps';
import { readShellRecords } from './reader';
import { toShell } from './shell-data';

export const listSessionShells = (
  deps: SessionRouterDeps,
  sessionId: string,
): SessionShellsOutput => {
  deps.readSession(sessionId);
  const actor = deps.sessions.getSnapshot().context.sessions[sessionId];
  const runtime = actor?.getSnapshot().context.shellRuntime;

  return readShellRecords(deps.database, sessionId).map((record) =>
    toShell(record, {
      now: Date.now(),
      terminalAvailable: runtime?.canStop(record.id) ?? false,
    }),
  );
};

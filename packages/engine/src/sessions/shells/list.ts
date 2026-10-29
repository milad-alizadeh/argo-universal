import type { SessionShellsOutput } from '@repo/contracts';
import type { OpenSessions } from '../open-sessions';
import { readShellRecords } from './reader';
import { toShell } from './shell-data';

export const listSessionShells = (
  open: OpenSessions,
  sessionId: string,
): SessionShellsOutput => {
  open.readSession(sessionId);
  const runtime = open.context(sessionId)?.shellRuntime;

  return readShellRecords(open.database, sessionId).map((record) =>
    toShell(record, {
      now: Date.now(),
      terminalAvailable: runtime?.canStop(record.id) ?? false,
    }),
  );
};

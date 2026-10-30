import type { SessionShellsOutput } from '@repo/contracts';
import type { HandlerSources } from '../session-sources';
import { readShellRecords } from './reader';
import { toShell } from './shell-data';

type ListSources = HandlerSources<'database' | 'readSession', 'context'>;

export const listSessionShells = (
  sources: ListSources,
  sessionId: string,
): SessionShellsOutput => {
  sources.readSession(sessionId);
  const runtime = sources.open.context(sessionId)?.shellRuntime;

  return readShellRecords(sources.database, sessionId).map((record) =>
    toShell(record, {
      now: Date.now(),
      terminalAvailable: runtime?.canStop(record.id) ?? false,
    }),
  );
};

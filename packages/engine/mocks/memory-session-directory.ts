import { TRPCError } from '@trpc/server';
import type { DirectorySession, SessionDirectory } from '../src/sessions';

// A Session the test names: still opening has no row yet, and running has a running Turn.
export type MemorySession = DirectorySession & {
  opening?: true;
  running?: true;
  title?: string;
  agent?: string;
};

const missing = (sessionId: string): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No Session ${sessionId}` });

const fields = ({
  projectId,
  startedBySessionId,
}: DirectorySession): DirectorySession => ({ projectId, startedBySessionId });

const sessionFinder =
  (
    sessions: Record<string, MemorySession>,
  ): ((sessionId: string) => MemorySession) =>
  (sessionId) => {
    const found = sessions[sessionId];

    if (!found) throw missing(sessionId);

    return found;
  };

// A Session still opening has no row yet, so reading it as a Session finds none.
const opened = (found: MemorySession, sessionId: string): MemorySession => {
  if (found.opening) throw missing(sessionId);

  return found;
};

// The in-memory adapter for the Session directory: a fixed table of Sessions, read as the live directory reads them.
export function memorySessionDirectory(
  sessions: Record<string, MemorySession>,
): SessionDirectory {
  const find = sessionFinder(sessions);

  return {
    session: (sessionId) => fields(opened(find(sessionId), sessionId)),
    opening: (sessionId) => fields(find(sessionId)),
    title: (sessionId) => find(sessionId).title ?? sessionId,
    agent: (sessionId) => find(sessionId).agent ?? 'mock',
    running: (callerId) => runningSessions(sessions, callerId),
  };
}

const runningSessions = (
  sessions: Record<string, MemorySession>,
  callerId: string,
): string[] =>
  Object.entries(sessions)
    .filter(([, item]) => item.startedBySessionId === callerId)
    .filter(([, item]) => item.running)
    .map(([sessionId]) => sessionId);

import { TRPCError } from '@trpc/server';
import type { DirectorySession, SessionDirectory } from '../src/sessions';

// A Session the test names: still opening has no row yet, and running has a running Turn.
export type MemorySession = DirectorySession & {
  opening?: true;
  running?: true;
  title?: string;
};

const missing = (sessionId: string): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No Session ${sessionId}` });

const fields = ({
  projectId,
  startedBySessionId,
}: DirectorySession): DirectorySession => ({ projectId, startedBySessionId });

// The in-memory adapter for the Session directory: a fixed table of Sessions, read as the live directory reads them.
export function memorySessionDirectory(
  sessions: Record<string, MemorySession>,
): SessionDirectory {
  const find = (sessionId: string): MemorySession => {
    const found = sessions[sessionId];

    if (!found) throw missing(sessionId);

    return found;
  };

  return {
    session: (sessionId) => {
      const found = find(sessionId);

      if (found.opening) throw missing(sessionId);

      return fields(found);
    },
    opening: (sessionId) => fields(find(sessionId)),
    title: (sessionId) => find(sessionId).title ?? sessionId,
    running: (callerId) =>
      Object.entries(sessions)
        .filter(([, item]) => item.startedBySessionId === callerId)
        .filter(([, item]) => item.running)
        .map(([sessionId]) => sessionId),
  };
}

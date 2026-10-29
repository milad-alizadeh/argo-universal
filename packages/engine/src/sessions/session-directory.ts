import { readSessionCloseTarget } from './close-target';
import { runningStartedSessions } from './delegation';
import type { OpenSessions } from './open-sessions';

// What a Session caller's scope knows of a Session: its Project, and the Session that started it.
export type DirectorySession = {
  projectId: string;
  startedBySessionId: string | null;
};

// The Sessions a caller's scope can see, read as the Operations that act on them read them.
export type SessionDirectory = {
  // The Session row with the Writer's queued jobs over the stored row; NOT_FOUND while still opening.
  session: (sessionId: string) => DirectorySession;
  // As `session`, and also a native opening that has no row yet.
  opening: (sessionId: string) => DirectorySession;
  // Sessions the caller started whose Turn is running.
  running: (callerId: string) => string[];
  // The Session's title, read as `session` reads its row: it names a calling Session as a Prompt sender.
  title: (sessionId: string) => string;
};

export function createSessionDirectory(open: OpenSessions): SessionDirectory {
  return {
    session: (sessionId) => directorySession(open.queued(sessionId)),
    opening: (sessionId) =>
      directorySession(readSessionCloseTarget(open, sessionId)),
    running: (callerId) => runningStartedSessions(open, callerId),
    title: (sessionId) => open.queued(sessionId).title,
  };
}

const directorySession = ({
  projectId,
  startedBySessionId,
}: DirectorySession): DirectorySession => ({ projectId, startedBySessionId });

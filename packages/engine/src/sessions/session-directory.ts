import { readSessionCloseTarget } from './close-target';
import { runningStartedSessions } from './delegation';
import type { SessionRouterDeps } from './router-deps';
import { createQueuedSessionReader } from './session-record';

// What a Session caller's scope knows of a Session: its Project, and the Session that started it.
export type DirectorySession = {
  projectId: string;
  startedBySessionId: string | null;
};

// A Session with a stored row also has its title, which names it as a Prompt sender.
type StoredSession = DirectorySession & { title: string };

// The Sessions a caller's scope can see, read as the Operations that act on them read them.
export type SessionDirectory = {
  // The Session row with the Writer's queued jobs over the stored row; NOT_FOUND while still opening.
  session: (sessionId: string) => StoredSession;
  // As `session`, and also a native opening that has no row yet.
  opening: (sessionId: string) => DirectorySession;
  // Sessions the caller started whose Turn is running.
  running: (callerId: string) => string[];
};

type Sources = Pick<SessionRouterDeps, 'database' | 'findWriter' | 'sessions'>;

export function createSessionDirectory(deps: Sources): SessionDirectory {
  const read = createQueuedSessionReader(deps);

  return {
    session: (sessionId) => storedSession(read(sessionId)),
    opening: (sessionId) =>
      directorySession(readSessionCloseTarget(deps, sessionId)),
    running: (callerId) => runningStartedSessions(deps, callerId),
  };
}

const directorySession = ({
  projectId,
  startedBySessionId,
}: DirectorySession): DirectorySession => ({ projectId, startedBySessionId });

const storedSession = (session: StoredSession): StoredSession => ({
  ...directorySession(session),
  title: session.title,
});

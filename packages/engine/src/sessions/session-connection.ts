import type { AgentLaunch, AcpResources, AcpSessionLease } from '../agents';
import {
  openSessionActor,
  type OpenSessionsActorRef,
} from './open-sessions-machine';
import type { SessionContext } from './session-context';

type ConnectionSubject = { agent: string; projectId: string };

const matchesSubject = (
  session: ConnectionSubject,
  subject: ConnectionSubject,
): boolean =>
  session.agent === subject.agent && session.projectId === subject.projectId;

const currentLease = (session: SessionContext): AcpSessionLease | undefined =>
  session.acpLease ?? undefined;

// What the Agents module may read of open Sessions: the shared ACP resources and one Session's connection.
export type SessionConnections = {
  acpResources: () => AcpResources;
  // The launch of a Session that runs on its own private connection.
  privateLaunch: (
    sessionId: string,
    subject: ConnectionSubject,
  ) => AgentLaunch | undefined;
  authentication: (
    sessionId: string,
    subject: ConnectionSubject,
  ) => AcpSessionLease['authentication'];
};

function findSessionLease(
  sessions: OpenSessionsActorRef,
  sessionId: string,
  subject: ConnectionSubject,
): AcpSessionLease | undefined {
  const actor = openSessionActor(sessions.getSnapshot().context, sessionId);

  if (!actor) return;
  const session = actor.getSnapshot().context;

  if (!matchesSubject(session, subject)) return;

  return currentLease(session);
}

export const createSessionConnections = (
  sessions: OpenSessionsActorRef,
): SessionConnections => ({
  acpResources: () => sessions.getSnapshot().context.acpResources,
  authentication: (sessionId, subject) =>
    findSessionLease(sessions, sessionId, subject)?.authentication,
  privateLaunch: (sessionId, subject) => {
    const lease = findSessionLease(sessions, sessionId, subject);

    return lease?.connectionKind === 'private' ? lease.launch : undefined;
  },
});

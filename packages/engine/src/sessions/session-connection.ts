import type { AgentLaunch, AcpResources, AcpSessionLease } from '../agents';
import type { OpenSessionsActorRef } from './open-sessions-machine';

type ConnectionSubject = { agent: string; projectId: string };

// What the Agents module may read of open Sessions: the shared ACP resources and one Session's connection.
export type SessionConnections = {
  acpResources: () => AcpResources;
  launch: (
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
  const session = sessions
    .getSnapshot()
    .context.sessions[sessionId]?.getSnapshot().context;

  if (
    session?.agent !== subject.agent ||
    session.projectId !== subject.projectId
  )
    return;

  return session.acpLease ?? undefined;
}

export const createSessionConnections = (
  sessions: OpenSessionsActorRef,
): SessionConnections => ({
  acpResources: () => sessions.getSnapshot().context.acpResources,
  authentication: (sessionId, subject) =>
    findSessionLease(sessions, sessionId, subject)?.authentication,
  launch: (sessionId, subject) =>
    findSessionLease(sessions, sessionId, subject)?.launch,
});

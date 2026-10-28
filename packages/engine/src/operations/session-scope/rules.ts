import { operations, type OperationId } from '@repo/contracts/operations';
import type { DirectorySession, OperationCard } from '../../sessions';
import type { SessionCaller } from '../session-tokens';

type TargetSession = DirectorySession & { sessionId: string };

// A Session token's own scope is its Project and the Sessions it started (ADR-0044).
export const inCallerProject = (
  caller: SessionCaller,
  projectId: string,
): boolean => projectId === caller.projectId;

const startedByCaller = (
  caller: SessionCaller,
  session: DirectorySession,
): boolean => session.startedBySessionId === caller.sessionId;

// act: the caller itself, or a Session it started, in the caller's Project. ACP's parent link grants nothing.
export function ownsSession(
  caller: SessionCaller,
  session: TargetSession,
): boolean {
  const owned =
    session.sessionId === caller.sessionId || startedByCaller(caller, session);

  return owned && inCallerProject(caller, session.projectId);
}

// session.prompt: a Session the caller started, in its Project; the caller is not one of its own Agents.
export function ownsAgent(
  caller: SessionCaller,
  session: DirectorySession,
): boolean {
  return (
    startedByCaller(caller, session) &&
    inCallerProject(caller, session.projectId)
  );
}

// The Permission request card: the Operation's label, and its description.
export const operationCard = (id: OperationId): OperationCard => ({
  title: operations[id].label,
  description: operations[id].description,
});

export const startCard: OperationCard = {
  title: operations['session.new'].label,
  description:
    'Start a Session outside the calling Session’s Project or delegation limits.',
};

export const promptCard: OperationCard = {
  title: operations['session.prompt'].label,
  description:
    'Send a prompt outside the calling Session’s Agents or delegation limits.',
};

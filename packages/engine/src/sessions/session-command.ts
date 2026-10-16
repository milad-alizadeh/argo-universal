import { TRPCError } from '@trpc/server';
import {
  notInstalledError,
  type InstalledAgent,
  type InstalledAgents,
} from '../agents';
import type { LocalSubmission } from './acp/prompts/submission';
import type {
  OpenSessionsActorRef,
  OpenSessionsCommand,
} from './open-sessions-machine';
import type { SessionRouterDeps } from './router-deps';
import type { SessionActorRef, SessionCommand } from './session-machine';

export const submitSessionPrompt = (
  session: SessionActorRef,
  submission: LocalSubmission,
): Promise<void> => {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, {
    type: 'session.prompt',
    ...submission,
    committed,
  });

  return committed.promise;
};

export function sendSessionCommand(
  session: SessionActorRef,
  command: SessionCommand,
): void {
  const snapshot = session.getSnapshot();

  if (!snapshot.can(command)) rejectSessionCommand(session, command.type);
  session.send(command);
}

// A procedure that needs a ready Session: a Session command, or `session.open`, which only waits for one.
export type ReadySessionCommandType = SessionCommand['type'] | 'session.open';

export function rejectSessionCommand(
  session: SessionActorRef,
  commandType: ReadySessionCommandType,
): never {
  const { value, context } = session.getSnapshot();
  const refusal = `Session cannot accept ${commandType} in ${JSON.stringify(value)}`;
  throw new TRPCError({
    code: 'CONFLICT',
    message:
      context.failure === null ? refusal : `${refusal}: ${context.failure}`,
  });
}

// New Session, Send, open and Retry admit only an Installed Agent.
export function requireInstalledAgent(
  installedAgents: InstalledAgents,
  agent: string,
): InstalledAgent {
  const answer = installedAgents.installedAgent(agent);

  if (!answer.installed) throw notInstalledError(answer);

  return answer.agent;
}

export function validateSessionCommandAdmission(
  deps: Pick<SessionRouterDeps, 'sessions' | 'sessionCommandSignal'>,
): void {
  validateEngineCommandAdmission(deps.sessionCommandSignal);
  const openSessionsSnapshot = deps.sessions.getSnapshot();

  if (
    openSessionsSnapshot.status !== 'active' ||
    !openSessionsSnapshot.matches('running')
  )
    rejectOpenSessionsCommand(deps.sessions, 'commands');
}

function validateEngineCommandAdmission(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Engine is stopping',
    });
}

export function rejectOpenSessionsCommand(
  openSessions: OpenSessionsActorRef,
  commandType: OpenSessionsCommand['type'] | 'commands',
): never {
  throw new TRPCError({
    code: 'CONFLICT',
    message: `The open Sessions machine cannot accept ${commandType} in ${JSON.stringify(openSessions.getSnapshot().value)}`,
  });
}

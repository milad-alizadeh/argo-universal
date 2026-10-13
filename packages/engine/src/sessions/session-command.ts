import type { ContentBlock } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { LocalSubmission } from './acp/submission';
import type {
  OpenSessionsActorRef,
  OpenSessionsCommand,
} from './open-sessions-machine';
import type { SessionRouterDeps } from './router-deps';
import type { SessionActorRef, SessionCommand } from './session-machine';

// A native adapter would drop every block but text, so the prompt is refused instead.
export function requireTextOnlyPrompt(content: readonly ContentBlock[]): void {
  if (content.every((block) => block.type === 'text')) return;
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message:
      "This Agent can't receive attachments yet. Install it from Agents, then send again.",
  });
}

export const submitSessionPrompt = (
  session: SessionActorRef,
  submission: LocalSubmission,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) {
    requireTextOnlyPrompt(submission.content);
    sendSessionCommand(session, { type: 'session.prompt', ...submission });
    return Promise.resolve();
  }
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

export function rejectSessionCommand(
  session: SessionActorRef,
  commandType: SessionCommand['type'],
): never {
  const { value, context } = session.getSnapshot();
  const refusal = `Session cannot accept ${commandType} in ${JSON.stringify(value)}`;
  throw new TRPCError({
    code: 'CONFLICT',
    message:
      context.failure === null ? refusal : `${refusal}: ${context.failure}`,
  });
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

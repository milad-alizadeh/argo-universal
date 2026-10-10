import { TRPCError } from '@trpc/server';
import type { Context } from '../../engine/context';
import type { LocalSubmission } from './conversation/submission';
import type { RegistryActorRef, RegistryCommand } from './registry-machine';
import type { SessionActorRef, SessionCommand } from './session-machine';

export const submitSessionPrompt = (
  session: SessionActorRef,
  submission: LocalSubmission,
): Promise<void> => {
  if (!session.getSnapshot().context.acpLease) {
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
  context: Pick<Context, 'sessions' | 'sessionCommandSignal'>,
): void {
  validateEngineCommandAdmission(context.sessionCommandSignal);
  const registrySnapshot = context.sessions.getSnapshot();
  if (
    registrySnapshot.status !== 'active' ||
    !registrySnapshot.matches('running')
  )
    rejectRegistryCommand(context.sessions, 'commands');
}

function validateEngineCommandAdmission(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Engine is stopping',
    });
}

export function rejectRegistryCommand(
  sessionRegistry: RegistryActorRef,
  commandType: RegistryCommand['type'] | 'commands',
): never {
  throw new TRPCError({
    code: 'CONFLICT',
    message: `Session registry cannot accept ${commandType} in ${JSON.stringify(sessionRegistry.getSnapshot().value)}`,
  });
}

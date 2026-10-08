import { TRPCError } from '@trpc/server';
import type { SessionActorRef, SessionCommand } from './session-machine';

export function sendSessionCommand(
  session: SessionActorRef,
  command: SessionCommand,
): void {
  const snapshot = session.getSnapshot();
  if (!snapshot.can(command))
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Session cannot accept ${command.type} in ${JSON.stringify(snapshot.value)}`,
    });
  session.send(command);
}

import { TRPCError } from '@trpc/server';
import { sessionActorId } from '../sessions';
import type { VoiceCallActorRef } from './call.machine';

// No Voice call is running, or what asked is refused.
export function requireNoCall(actor: VoiceCallActorRef): void {
  if (!actor.getSnapshot().matches('idle'))
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Voice call is already running',
    });
}

// There is no call yet and the Session is open, or the start is refused.
export function requireRoom(actor: VoiceCallActorRef, sessionId: string): void {
  requireNoCall(actor);

  if (!actor.system.get(sessionActorId(sessionId)))
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'The Session is not open',
    });
}

import { TRPCError } from '@trpc/server';
import type { AnyActorRef } from 'xstate';
import { findMachineActor } from '../../lib/machine-actor';
import { type SessionActorRef, sessionMachine } from './session-machine';

export const sessionActorId = (sessionId: string): string =>
  `session:${sessionId}`;

export function requireLiveSessionActor(
  system: AnyActorRef['system'],
  sessionId: string,
): SessionActorRef {
  const sessionActor = findMachineActor(
    system,
    sessionActorId(sessionId),
    sessionMachine,
  );
  if (!sessionActor)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No Session ${sessionId}`,
    });
  return sessionActor;
}

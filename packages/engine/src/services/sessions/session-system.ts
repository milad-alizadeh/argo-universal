import { TRPCError } from '@trpc/server';
import type { AnyActorRef } from 'xstate';
import { isMachineActor } from '../../lib/machine-actor';
import { type SessionActorRef, sessionMachine } from './session-machine';

export const sessionActorId = (sessionId: string): string =>
  `session:${sessionId}`;

export function findSessionActor(
  system: AnyActorRef['system'],
  sessionId: string,
): SessionActorRef | undefined {
  const actor = system.get(sessionActorId(sessionId));
  return isMachineActor(actor, sessionMachine) ? actor : undefined;
}

export function requireLiveSessionActor(
  system: AnyActorRef['system'],
  sessionId: string,
): SessionActorRef {
  const sessionActor = findSessionActor(system, sessionId);
  if (!sessionActor)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No Session ${sessionId}`,
    });
  return sessionActor;
}

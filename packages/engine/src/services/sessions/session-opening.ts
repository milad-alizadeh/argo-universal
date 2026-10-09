import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import type { RegistryActorRef, RegistryCommand } from './registry-machine';
import type { SessionActorRef } from './session-machine';
import { isSessionReady } from './session-snapshot';
import { findSessionActor } from './session-system';

export function sendCheckedRegistryCommand(
  sessionRegistry: RegistryActorRef,
  registryCommand: RegistryCommand,
): void {
  const registrySnapshot = sessionRegistry.getSnapshot();
  if (!registrySnapshot.can(registryCommand))
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Session registry cannot accept ${registryCommand.type} in ${JSON.stringify(registrySnapshot.value)}`,
    });
  sessionRegistry.send(registryCommand);
}

export function requireOpenSessionActor(
  sessionRegistry: RegistryActorRef,
  sessionId: string,
): SessionActorRef {
  const sessionActor = findSessionActor(sessionRegistry.system, sessionId);
  if (!sessionActor)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Session ${sessionId} did not open`,
    });
  return sessionActor;
}

async function waitForSessionReady(
  sessionActor: SessionActorRef,
): Promise<SessionActorRef> {
  const sessionSnapshot = await waitFor(
    sessionActor,
    (sessionSnapshot): boolean =>
      sessionSnapshot.status !== 'active' || isSessionReady(sessionSnapshot),
    { timeout: Infinity },
  );
  if (sessionSnapshot.status !== 'active')
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        sessionSnapshot.context.failure ??
        `Session ${sessionSnapshot.context.sessionId} closed`,
    });
  return sessionActor;
}

export async function openReadySession(
  context: Pick<Context, 'sessions' | 'readSession'>,
  sessionId: string,
): Promise<SessionActorRef> {
  const sessionRecord = context.readSession(sessionId);
  if (sessionRecord.parentSessionId !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Subagent is read-only',
    });
  sendCheckedRegistryCommand(context.sessions, {
    type: 'sessions.open',
    sessionId,
    agent: sessionRecord.agent,
  });
  return waitForSessionReady(
    requireOpenSessionActor(context.sessions, sessionId),
  );
}

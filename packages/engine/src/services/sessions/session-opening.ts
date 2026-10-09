import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import type { RegistryActorRef, RegistryCommand } from './registry-machine';
import {
  rejectSessionCommand,
  rejectRegistryCommand,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef, SessionCommand } from './session-machine';
import { isSessionReady } from './session-snapshot';
import { findSessionActor } from './session-system';

export function sendCheckedRegistryCommand(
  sessionRegistry: RegistryActorRef,
  registryCommand: RegistryCommand,
): void {
  const registrySnapshot = sessionRegistry.getSnapshot();
  if (!registrySnapshot.can(registryCommand))
    rejectRegistryCommand(sessionRegistry, registryCommand.type);
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

function isInitialSessionStartup(
  snapshot: ReturnType<SessionActorRef['getSnapshot']>,
): boolean {
  const initialStates = [
    'loading',
    'creating',
    { open: { acp: 'opening' } },
    { open: { live: 'starting' } },
  ] as const;
  return (
    snapshot.context.agentCrashes.length === 0 &&
    initialStates.some((state): boolean => snapshot.matches(state))
  );
}

async function waitForSessionReady(
  sessionActor: SessionActorRef,
  commandType: SessionCommand['type'],
): Promise<SessionActorRef> {
  await waitFor(
    sessionActor,
    (sessionSnapshot): boolean =>
      sessionSnapshot.status !== 'active' ||
      !isInitialSessionStartup(sessionSnapshot),
    { timeout: Infinity },
  );
  return requireReadySession(sessionActor, commandType);
}

function requireReadySession(
  sessionActor: SessionActorRef,
  commandType: SessionCommand['type'],
): SessionActorRef {
  const sessionSnapshot = sessionActor.getSnapshot();
  if (sessionSnapshot.status !== 'active') rejectClosedSession(sessionSnapshot);
  if (!isSessionReady(sessionSnapshot))
    rejectSessionCommand(sessionActor, commandType);
  return sessionActor;
}

function rejectClosedSession(
  snapshot: ReturnType<SessionActorRef['getSnapshot']>,
): never {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message:
      snapshot.context.failure ??
      `Session ${snapshot.context.sessionId} closed`,
  });
}

export async function openReadySession(
  context: Pick<Context, 'sessions' | 'readSession' | 'sessionCommandSignal'>,
  sessionId: string,
  commandType: SessionCommand['type'] = 'session.prompt',
): Promise<SessionActorRef> {
  validateSessionCommandAdmission(context);
  const liveSession = findSessionActor(context.sessions.system, sessionId);
  if (liveSession) return waitForSessionReady(liveSession, commandType);
  return waitForSessionReady(
    openStoredSession(context, sessionId),
    commandType,
  );
}

function openStoredSession(
  context: Pick<Context, 'sessions' | 'readSession'>,
  sessionId: string,
): SessionActorRef {
  const sessionRecord = readWritableSession(context.readSession, sessionId);
  sendCheckedRegistryCommand(context.sessions, {
    type: 'sessions.open',
    sessionId,
    agent: sessionRecord.agent,
  });
  return requireOpenSessionActor(context.sessions, sessionId);
}

function readWritableSession(
  readSession: Context['readSession'],
  sessionId: string,
): ReturnType<Context['readSession']> {
  const sessionRecord = readSession(sessionId);
  if (sessionRecord.parentSessionId !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Subagent is read-only',
    });
  return sessionRecord;
}

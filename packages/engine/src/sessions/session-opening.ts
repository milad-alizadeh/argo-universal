import {
  SessionOpenFailure,
  type SessionOpenInput,
  type SessionOpenOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import type {
  OpenSessionsActorRef,
  OpenSessionsCommand,
} from './open-sessions-machine';
import type { SessionRouterDeps } from './router-deps';
import {
  type ReadySessionCommandType,
  rejectSessionCommand,
  rejectOpenSessionsCommand,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef } from './session-machine';
import { sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';

export function sendCheckedOpenSessionsCommand(
  openSessions: OpenSessionsActorRef,
  openSessionsCommand: OpenSessionsCommand,
): void {
  const openSessionsSnapshot = openSessions.getSnapshot();

  if (!openSessionsSnapshot.can(openSessionsCommand))
    rejectOpenSessionsCommand(openSessions, openSessionsCommand.type);
  openSessions.send(openSessionsCommand);
}

export function requireOpenSessionActor(
  openSessions: OpenSessionsActorRef,
  sessionId: string,
): SessionActorRef {
  const sessionActor = findMachineActor(
    openSessions.system,
    sessionActorId(sessionId),
    sessionMachine,
  );

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
    { open: { acp: 'restoring' } },
  ] as const;

  return initialStates.some((state): boolean => snapshot.matches(state));
}

async function waitForSessionReady(
  sessionActor: SessionActorRef,
  commandType: ReadySessionCommandType,
): Promise<SessionActorRef> {
  await waitFor(
    sessionActor,
    (sessionSnapshot): boolean =>
      sessionSnapshot.status !== 'active' ||
      (!isInitialSessionStartup(sessionSnapshot) &&
        (commandType !== 'session.prompt' ||
          (!sessionSnapshot.matches({ open: { acp: 'configuring' } }) &&
            !sessionSnapshot.matches({
              open: { acp: { activeTurn: 'cancelling' } },
            })))),
    { timeout: Infinity },
  );

  return requireReadySession(sessionActor, commandType);
}

function requireReadySession(
  sessionActor: SessionActorRef,
  commandType: ReadySessionCommandType,
): SessionActorRef {
  const sessionSnapshot = sessionActor.getSnapshot();

  if (sessionSnapshot.context.openError) rejectClosedSession(sessionSnapshot);

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
    cause: snapshot.context.openError
      ? new SessionOpenFailure(snapshot.context.openError)
      : undefined,
    message:
      snapshot.context.failure ??
      `Session ${snapshot.context.sessionId} closed`,
  });
}

export async function openReadySession(
  deps: Pick<
    SessionRouterDeps,
    'sessions' | 'readSession' | 'sessionCommandSignal'
  >,
  sessionId: string,
  commandType: ReadySessionCommandType = 'session.prompt',
): Promise<SessionActorRef> {
  validateSessionCommandAdmission(deps);

  const liveSession = findMachineActor(
    deps.sessions.system,
    sessionActorId(sessionId),
    sessionMachine,
  );

  if (liveSession) return waitForSessionReady(liveSession, commandType);

  return waitForSessionReady(openStoredSession(deps, sessionId), commandType);
}

// Opens a Session, or waits for its open, without a Turn: Retry after a failed open never resends one.
export const openSession = async (
  deps: Pick<
    SessionRouterDeps,
    'sessions' | 'readSession' | 'sessionCommandSignal'
  >,
  { sessionId }: SessionOpenInput,
): Promise<SessionOpenOutput> => {
  await openReadySession(deps, sessionId, 'session.open');

  return {};
};

function openStoredSession(
  deps: Pick<SessionRouterDeps, 'sessions' | 'readSession'>,
  sessionId: string,
): SessionActorRef {
  const sessionRecord = readWritableSession(deps.readSession, sessionId);
  sendCheckedOpenSessionsCommand(deps.sessions, {
    type: 'sessions.open',
    sessionId,
    agent: sessionRecord.agent,
  });

  return requireOpenSessionActor(deps.sessions, sessionId);
}

export function readWritableSession(
  readSession: SessionRouterDeps['readSession'],
  sessionId: string,
): ReturnType<SessionRouterDeps['readSession']> {
  const sessionRecord = readSession(sessionId);

  if (sessionRecord.archivedAt !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'An archived Session is read-only',
    });

  if (sessionRecord.parentSessionId !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Subagent is read-only',
    });

  return sessionRecord;
}

function isSessionReady(
  session: ReturnType<SessionActorRef['getSnapshot']>,
): boolean {
  return (
    session.matches({ open: 'acp' }) &&
    !(['opening', 'restoring', 'closing', 'flushing'] as const).some((state) =>
      session.matches({ open: { acp: state } }),
    )
  );
}

import { type SessionOpenInput, type SessionOpenOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { findMachineActor } from '../lib/machine-actor';
import type {
  OpenSessionsActorRef,
  OpenSessionsCommand,
} from './open-sessions-machine';
import type { SessionRouterDeps } from './router-deps';
import {
  type ReadySessionCommandType,
  rejectOpenSessionsCommand,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef } from './session-machine';
import { sessionMachine } from './session-machine';
import { waitForSessionReady } from './session-readiness';
import { sessionActorId } from './session-system';

const openingFailure = (sessionId: string): TRPCError =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Session ${sessionId} did not open`,
  });

const archivedSession = (): TRPCError =>
  new TRPCError({
    code: 'CONFLICT',
    message: 'An archived Session is read-only',
  });

const subagentSession = (): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message: 'A Subagent is read-only' });

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

  if (!sessionActor) throw openingFailure(sessionId);

  return sessionActor;
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

  const liveSession = findOpenActor(deps.sessions, sessionId);

  if (liveSession) return waitForSessionReady(liveSession, commandType);

  return waitForSessionReady(openStoredSession(deps, sessionId), commandType);
}

const findOpenActor = (
  sessions: OpenSessionsActorRef,
  sessionId: string,
): SessionActorRef | undefined =>
  findMachineActor(sessions.system, sessionActorId(sessionId), sessionMachine);

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

  if (sessionRecord.archivedAt !== null) throw archivedSession();

  if (sessionRecord.parentSessionId !== null) throw subagentSession();

  return sessionRecord;
}

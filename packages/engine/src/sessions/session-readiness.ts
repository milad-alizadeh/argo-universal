import { SessionOpenFailure } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import {
  rejectSessionCommand,
  type ReadySessionCommandType,
} from './session-command';
import type { SessionActorRef } from './session-machine';

type Snapshot = ReturnType<SessionActorRef['getSnapshot']>;

const promptCanStart = (snapshot: Snapshot): boolean =>
  !snapshot.matches({ open: { acp: 'configuring' } }) &&
  !snapshot.matches({ open: { acp: { activeTurn: 'cancelling' } } });

const commandCanStart = (
  snapshot: Snapshot,
  commandType: ReadySessionCommandType,
): boolean => commandType !== 'session.prompt' || promptCanStart(snapshot);

const reachedReadiness = (
  snapshot: Snapshot,
  commandType: ReadySessionCommandType,
): boolean =>
  snapshot.status !== 'active' ||
  (!isInitialSessionStartup(snapshot) &&
    commandCanStart(snapshot, commandType));

function isInitialSessionStartup(
  snapshot: ReturnType<SessionActorRef['getSnapshot']>,
): boolean {
  const initialStates = [
    'loading',
    'creating',
    { open: { acp: 'opening' } },
  ] as const;

  return initialStates.some((state): boolean => snapshot.matches(state));
}

export async function waitForSessionReady(
  sessionActor: SessionActorRef,
  commandType: ReadySessionCommandType,
): Promise<SessionActorRef> {
  await waitFor(
    sessionActor,
    (snapshot): boolean => reachedReadiness(snapshot, commandType),
    { timeout: Infinity },
  );

  return requireReadySession(sessionActor, commandType);
}

function requireReadySession(
  sessionActor: SessionActorRef,
  commandType: ReadySessionCommandType,
): SessionActorRef {
  const sessionSnapshot = sessionActor.getSnapshot();

  requireActiveSession(sessionSnapshot);

  if (!isSessionReady(sessionSnapshot))
    rejectSessionCommand(sessionActor, commandType);

  return sessionActor;
}

function requireActiveSession(snapshot: Snapshot): void {
  if (snapshot.context.openError) rejectClosedSession(snapshot);

  if (snapshot.status !== 'active') rejectClosedSession(snapshot);
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

function isSessionReady(
  session: ReturnType<SessionActorRef['getSnapshot']>,
): boolean {
  return (
    session.matches({ open: 'acp' }) &&
    !(['opening', 'closing', 'flushing'] as const).some((state) =>
      session.matches({ open: { acp: state } }),
    )
  );
}

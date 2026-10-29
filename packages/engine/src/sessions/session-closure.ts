import type { SessionCancelOutput, SessionCloseOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { readSessionCloseTarget } from './close-target';
import type { SessionRouterDeps } from './router-deps';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef } from './session-machine';
import { readWritableSession } from './session-opening';
import { createQueuedSessionReader } from './session-record';
import { requireLiveSessionActor } from './session-system';

const isClosing = (actor: SessionActorRef): boolean => {
  const snapshot = actor.getSnapshot();

  return (
    snapshot.matches({ open: { acp: 'closing' } }) ||
    snapshot.matches({ open: { acp: 'flushing' } }) ||
    snapshot.matches('archived')
  );
};

type CloseDeps = Pick<
  SessionRouterDeps,
  | 'sessions'
  | 'readSession'
  | 'sessionCommandSignal'
  | 'database'
  | 'findWriter'
>;

function requireClosable(deps: CloseDeps, sessionId: string): void {
  if (readSessionCloseTarget(deps, sessionId).parentSessionId !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Subagent is read-only',
    });
}

async function awaitClosure(actor: SessionActorRef): Promise<void> {
  const outcome = await waitFor(
    actor,
    (snapshot) => snapshot.status !== 'active',
    { timeout: Infinity },
  );

  if (outcome.context.failure)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure,
    });
}

export const closeSession = async (
  deps: CloseDeps,
  sessionId: string,
): Promise<SessionCloseOutput> => {
  validateSessionCommandAdmission(deps);
  requireClosable(deps, sessionId);
  const actor = requireLiveSessionActor(deps.sessions.system, sessionId);

  if (!isClosing(actor)) sendSessionCommand(actor, { type: 'session.close' });

  await awaitClosure(actor);

  return {};
};

// Reads the Session as a Session caller's scope does, with the Writer's queued rows.
export const cancelSession = (
  deps: Pick<
    SessionRouterDeps,
    'sessions' | 'database' | 'findWriter' | 'sessionCommandSignal'
  >,
  sessionId: string,
): SessionCancelOutput => {
  validateSessionCommandAdmission(deps);
  readWritableSession(createQueuedSessionReader(deps), sessionId);
  sendSessionCommand(requireLiveSessionActor(deps.sessions.system, sessionId), {
    type: 'session.cancel',
  });

  return {};
};

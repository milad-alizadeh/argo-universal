import type { SessionCancelOutput, SessionCloseOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { readSessionCloseTarget } from './close-target';
import type { OpenSessions } from './open-sessions';
import { requireWritableSession, sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';

type ClosingSessions = Pick<
  OpenSessions,
  'admit' | 'live' | 'queued' | 'context'
>;

const isClosing = (actor: SessionActorRef): boolean => {
  const snapshot = actor.getSnapshot();

  return snapshot.hasTag('closing') || snapshot.hasTag('archived');
};

function requireClosable(sessions: ClosingSessions, sessionId: string): void {
  if (readSessionCloseTarget(sessions, sessionId).parentSessionId !== null)
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
  sessions: ClosingSessions,
  sessionId: string,
): Promise<SessionCloseOutput> => {
  sessions.admit();
  requireClosable(sessions, sessionId);
  const actor = sessions.live(sessionId);

  if (!isClosing(actor)) sendSessionCommand(actor, { type: 'session.close' });

  await awaitClosure(actor);

  return {};
};

// Reads the Session as a Session caller's scope does, with the Writer's queued rows.
export const cancelSession = (
  sessions: ClosingSessions,
  sessionId: string,
): SessionCancelOutput => {
  sessions.admit();
  requireWritableSession(sessions.queued(sessionId));
  sendSessionCommand(sessions.live(sessionId), { type: 'session.cancel' });

  return {};
};

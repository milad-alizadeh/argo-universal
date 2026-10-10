import type { SessionCloseOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef } from './session-machine';
import { requireLiveSessionActor } from './session-system';

const isClosing = (actor: SessionActorRef): boolean => {
  const snapshot = actor.getSnapshot();
  return (
    snapshot.matches({ open: { acp: 'closing' } }) ||
    snapshot.matches({ open: { acp: 'retainingCleanup' } }) ||
    snapshot.matches({ open: { acp: 'flushing' } })
  );
};

export const closeSession = async (
  context: Context,
  sessionId: string,
): Promise<SessionCloseOutput> => {
  validateSessionCommandAdmission(context);
  const actor = requireLiveSessionActor(context.sessions.system, sessionId);
  if (!isClosing(actor)) sendSessionCommand(actor, { type: 'session.close' });
  const outcome = await waitFor(
    actor,
    (snapshot) =>
      snapshot.status !== 'active' ||
      snapshot.matches({ open: { acp: 'retainingCleanup' } }),
    { timeout: Infinity },
  );
  if (outcome.context.failure)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure,
    });
  return {};
};

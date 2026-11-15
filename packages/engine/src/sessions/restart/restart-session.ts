import type { SessionRestart } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { OpenSessions } from '../open-sessions';
import { sendSessionCommand } from '../session-command';
import type { SessionActorRef } from '../session-machine';

type RestartingSessions = Pick<OpenSessions, 'admit' | 'ready'>;

type RestartTarget = { sessionId: string };

const restartEvent = 'session.restart';

const requireNoTurn = (session: SessionActorRef): void => {
  if (session.getSnapshot().hasTag('running'))
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Turn is running. Stop it, then try again.',
    });
};

async function stopped(session: SessionActorRef): Promise<void> {
  await waitFor(session, (snapshot) => snapshot.status !== 'active', {
    timeout: Infinity,
  });
}

/*
 * Restarts a Session's Agent session through the Session's own close and open, so there is one way to
 * open an Agent session. A Session with Agent access runs on its own Agent process, which ends with the
 * close and starts again with the open; a shared process stays while another Session uses it.
 */
export async function restartSession(
  sessions: RestartingSessions,
  { sessionId }: RestartTarget,
  restart: SessionRestart,
): Promise<Record<string, never>> {
  const session = await sessions.ready(sessionId, restartEvent);

  sessions.admit();
  requireNoTurn(session);
  sendSessionCommand(session, { type: restartEvent, restart });
  await stopped(session);
  await sessions.ready(sessionId, 'session.open');

  return {};
}

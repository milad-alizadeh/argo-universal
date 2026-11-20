import { fromCallback, type AnyActorRef } from 'xstate';
import { sessionActorId } from '../sessions';
import {
  sessionGone,
  type SendBack,
  type SessionGoneReason,
  type VoiceCallEvent,
} from './conversation-types';

export type SessionWatch = { sessionId: string };

type Tagged = {
  hasTag: (tag: string) => boolean;
  context: { archiveRequested: boolean };
};

const closed = 'session-closed';

// An archive closes the Session on its way to `archived`, so a close that was asked for as an archive is one.
const closingReason = (snapshot: Tagged): SessionGoneReason =>
  snapshot.context.archiveRequested ? 'session-archived' : closed;

const reasonOf = (snapshot: Tagged): SessionGoneReason | undefined => {
  if (snapshot.hasTag('archived')) return 'session-archived';

  return snapshot.hasTag('closing') ? closingReason(snapshot) : undefined;
};

function subscribeSession(actor: AnyActorRef, sendBack: SendBack): () => void {
  const subscription = actor.subscribe({
    next: (snapshot: Tagged) => {
      const reason = reasonOf(snapshot);
      sendBack({ type: 'session.turn', running: snapshot.hasTag('running') });

      if (reason) sendBack(sessionGone(reason));
    },
    complete: () => sendBack(sessionGone(closed)),
  });

  return (): void => subscription.unsubscribe();
}

function watchSessionActor(
  actor: AnyActorRef | undefined,
  sendBack: SendBack,
): () => void {
  if (actor) return subscribeSession(actor, sendBack);
  sendBack(sessionGone(closed));

  return () => {};
}

// Ends the call when its Session closes or is archived.
export const watchSession = fromCallback<VoiceCallEvent, SessionWatch>(
  ({ input, sendBack, system }) =>
    watchSessionActor(system.get(sessionActorId(input.sessionId)), sendBack),
);

export type ConnectionWatch = { signal: AbortSignal | undefined };

// Ends the call when the App Connection that started it goes away: the App quit or lost its link.
export const watchConnection = fromCallback<VoiceCallEvent, ConnectionWatch>(
  ({ input, sendBack }) => {
    const { signal } = input;
    const gone = (): void => sendBack({ type: 'call.appDisconnected' });

    signal?.addEventListener('abort', gone, { once: true });

    return (): void => signal?.removeEventListener('abort', gone);
  },
);

import { fromCallback, type AnyActorRef } from 'xstate';
import { appOfConnection } from '../rpc';
import { sessionActorId } from '../sessions';
import {
  sessionGone,
  type SendBack,
  type SessionGoneReason,
  type ConversationEvent,
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
export const watchSession = fromCallback<ConversationEvent, SessionWatch>(
  ({ input, sendBack, system }) =>
    watchSessionActor(system.get(sessionActorId(input.sessionId)), sendBack),
);

export type ConnectionWatch = { signal: AbortSignal | undefined };

export const appReconnectGraceMs = 15_000;

// The original audio peer stays alive while its App reconnects to the Server.
export const watchConnection = fromCallback<ConversationEvent, ConnectionWatch>(
  ({ input, sendBack, receive }) => {
    let signal = input.signal;
    const app = signal && appOfConnection(signal);
    let deadline = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = (): void => sendBack({ type: 'call.appDisconnected' });

    const gone = (): void => {
      if (!app) return expired();
      deadline = performance.now() + appReconnectGraceMs;
      timer = setTimeout(expired, appReconnectGraceMs);
    };

    receive((event) => {
      if (event.type !== 'call.appReconnect') return;
      const next = event.signal;

      if (
        !app ||
        next === signal ||
        (deadline !== 0 && performance.now() >= deadline) ||
        next.aborted ||
        appOfConnection(next) !== app
      )
        return;

      clearTimeout(timer);
      deadline = 0;
      signal?.removeEventListener('abort', gone);
      signal = next;
      next.addEventListener('abort', gone, { once: true });
      sendBack({ type: 'call.appReattached', signal: next });
    });

    if (signal?.aborted) gone();
    else signal?.addEventListener('abort', gone, { once: true });

    return (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', gone);
    };
  },
);

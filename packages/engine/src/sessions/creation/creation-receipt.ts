import type { SessionActorRef } from '../session-machine';

export const creationSettledEvent = 'session.creationSettled';

export type AcceptedSessionStart = { sessionId: string; turnId?: string };

export type SessionCreationReceipt =
  | { status: 'accepted'; start: AcceptedSessionStart }
  | { status: 'failed'; message: string };

export type SessionCreationSettled = {
  type: typeof creationSettledEvent;
  receipt: SessionCreationReceipt;
};

type CreationFailure = { cause: unknown };

// A specific Session owns this result even when its original HTTP caller detaches.
export function observeSessionCreation(
  session: SessionActorRef,
  completion: Promise<AcceptedSessionStart>,
): Promise<AcceptedSessionStart> {
  const result = completion.then(
    (value) => accepted(session, value),
    (cause) => failed(session, { cause }),
  );

  void result.catch(() => {});

  return result;
}

function accepted(
  session: SessionActorRef,
  start: AcceptedSessionStart,
): AcceptedSessionStart {
  publishReceipt(session, { status: 'accepted', start });

  return start;
}

function failed(session: SessionActorRef, { cause }: CreationFailure): never {
  const message = cause instanceof Error ? cause.message : String(cause);
  publishReceipt(session, { status: 'failed', message });
  throw cause;
}

function publishReceipt(
  session: SessionActorRef,
  receipt: SessionCreationReceipt,
): void {
  if (session.getSnapshot().status !== 'active') return;
  session.send({ type: creationSettledEvent, receipt });
}

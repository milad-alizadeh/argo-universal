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

// Ends a Session its creation failed, after the receipt that says why.
type CloseFailedCreation = (session: SessionActorRef) => void;

// A specific Session owns this result even when its original HTTP caller detaches.
export function observeSessionCreation(
  session: SessionActorRef,
  completion: Promise<AcceptedSessionStart>,
  closeFailed: CloseFailedCreation,
): Promise<AcceptedSessionStart> {
  const result = completion.then(
    (value) => accepted(session, value),
    (cause) => failed(session, { cause }, closeFailed),
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

// A caller waiting on this Session reads the receipt first, and its own failure never waits for the closing.
function failed(
  session: SessionActorRef,
  { cause }: CreationFailure,
  closeFailed: CloseFailedCreation,
): never {
  const message = cause instanceof Error ? cause.message : String(cause);
  publishReceipt(session, { status: 'failed', message });
  closeFailed(session);
  throw cause;
}

function publishReceipt(
  session: SessionActorRef,
  receipt: SessionCreationReceipt,
): void {
  if (session.getSnapshot().status !== 'active') return;
  session.send({ type: creationSettledEvent, receipt });
}

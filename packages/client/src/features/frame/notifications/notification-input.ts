import type {
  FeedSubscribeOutput,
  SessionInfo,
  SessionSnapshot,
} from '@repo/contracts';
import type { NotificationClient } from './notification-feed';

const planId = (plan: SessionSnapshot['pendingPlanProposal']): string | null =>
  plan?.planId ?? null;

export function pendingInputId(snapshot: SessionSnapshot): string | null {
  if (snapshot.pendingPermission) return snapshot.pendingPermission.requestId;

  if (snapshot.pendingElicitation) return snapshot.pendingElicitation.requestId;

  return planId(snapshot.pendingPlanProposal);
}

function inputFromEvent(
  event: FeedSubscribeOutput,
  resolve: (id: string | null) => void,
): void {
  if (event.type === 'snapshot') resolve(pendingInputId(event.snapshot));

  if (event.type === 'closed') resolve(null);
}

interface InputSubscription extends PromiseWithResolvers<string | null> {
  sessionId: string;
  signal: AbortSignal | undefined;
}

function subscribeToInput(
  client: NotificationClient,
  pending: InputSubscription,
): { unsubscribe: () => void } {
  return client.feed.subscribe.subscribe(
    { sessionId: pending.sessionId, after: null },
    {
      signal: pending.signal,
      onData: (event) => inputFromEvent(event, pending.resolve),
      onError: pending.reject,
    },
  );
}

function listenToAbort(
  signal: AbortSignal | undefined,
  resolve: (id: string | null) => void,
): () => void {
  if (!signal) return () => {};

  const aborted = (): void => resolve(null);

  if (signal.aborted) aborted();
  signal.addEventListener('abort', aborted, { once: true });

  return () => signal.removeEventListener('abort', aborted);
}

export async function readNotificationInput(
  client: NotificationClient,
  session: SessionInfo,
  signal?: AbortSignal,
): Promise<string | null> {
  if (session.status !== 'needs_input') return null;
  const pending = inputRequest(session, signal);
  const subscription = subscribeToInput(client, pending);
  const unlisten = listenToAbort(signal, pending.resolve);

  return pending.promise.finally(() => {
    subscription.unsubscribe();
    unlisten();
  });
}

export const inputRequestChanged = (
  previous: string | null | undefined,
  next: string | null,
): boolean => next !== null && next !== previous;

function inputRequest(
  session: SessionInfo,
  signal: AbortSignal | undefined,
): InputSubscription {
  return {
    ...Promise.withResolvers<string | null>(),
    sessionId: session.sessionId,
    signal,
  };
}

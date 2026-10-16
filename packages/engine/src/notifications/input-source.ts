import { pendingInputRequest, type SessionActorRef } from '../sessions';
import type { NotificationFact } from './facts';

export type InputNotification = Omit<
  Extract<NotificationFact, { kind: 'input_requested' }>,
  'sessionId' | 'title'
>;

export function pendingNotificationInput(
  session: SessionActorRef,
): InputNotification | null {
  const { context } = session.getSnapshot();
  const pending = pendingInputRequest(context);

  return pending
    ? {
        kind: 'input_requested',
        requestKind: pending.kind,
        requestId: pending.requestId,
        turnId: context.activeTurnId,
      }
    : null;
}

export const inputRequestId = (
  input: InputNotification | null,
): string | null => input?.requestId ?? null;

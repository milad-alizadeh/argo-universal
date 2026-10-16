import type { SessionActorRef } from '../sessions';
import type { NotificationFact } from './facts';

export type InputNotification = Omit<
  Extract<NotificationFact, { kind: 'input_requested' }>,
  'sessionId' | 'title'
>;

export function pendingNotificationInput(
  session: SessionActorRef,
): InputNotification | null {
  const { permissionQueue, elicitationQueue, activeTurnId } =
    session.getSnapshot().context;

  const permission = permissionQueue[0];

  if (permission)
    return inputRequest('permission', permission.requestId, activeTurnId);
  const elicitation = elicitationQueue[0];

  return elicitation
    ? inputRequest('elicitation', elicitation.requestId, activeTurnId)
    : null;
}

function inputRequest(
  requestKind: InputNotification['requestKind'],
  requestId: string,
  turnId: string | null,
): InputNotification {
  return { kind: 'input_requested', requestKind, requestId, turnId };
}

export const inputRequestId = (
  input: InputNotification | null,
): string | null => input?.requestId ?? null;

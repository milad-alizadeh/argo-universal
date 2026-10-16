import type { NotificationEvent } from '@repo/contracts';

export type NotificationFact =
  | Omit<
      Extract<NotificationEvent, { kind: 'turn_ended' }>,
      'id' | 'serverId' | 'occurredAt'
    >
  | Omit<
      Extract<NotificationEvent, { kind: 'input_requested' }>,
      'id' | 'serverId' | 'occurredAt'
    >;

export const notificationId = (fact: NotificationFact): string =>
  fact.kind === 'turn_ended'
    ? `${fact.sessionId}:turn:${fact.turnId}`
    : `${fact.sessionId}:${fact.requestKind}:${fact.requestId}`;

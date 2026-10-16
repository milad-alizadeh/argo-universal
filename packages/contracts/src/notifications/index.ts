import { z } from 'zod';

const eventFields = {
  id: z.string().min(1),
  serverId: z.string().min(1),
  sessionId: z.string().min(1),
  title: z.string(),
  occurredAt: z.int(),
};

export const NotificationEvent = z.discriminatedUnion('kind', [
  z.strictObject({
    ...eventFields,
    kind: z.literal('turn_ended'),
    turnId: z.string().min(1),
  }),
  z.strictObject({
    ...eventFields,
    kind: z.literal('input_requested'),
    turnId: z.string().nullable(),
    requestId: z.string().min(1),
    requestKind: z.enum(['permission', 'elicitation', 'plan']),
  }),
]);

export type NotificationEvent = z.infer<typeof NotificationEvent>;

export const NotificationAttention = z.strictObject({
  sessionId: z.string().min(1).nullable(),
});

export const NotificationSubscription = z.strictObject({
  deliver: z.boolean(),
});

export const NotificationAcknowledgement = z.strictObject({
  id: z.string().min(1),
});

export const NotificationStreamEvent = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ready'),
    serverId: z.string(),
    heartbeatMs: z.int().positive(),
  }),
  z.strictObject({
    type: z.literal('notification'),
    notification: NotificationEvent,
  }),
]);

export type NotificationStreamEvent = z.infer<typeof NotificationStreamEvent>;

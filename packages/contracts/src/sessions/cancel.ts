import { z } from 'zod';

// Input of `session.cancel`, after ACP `CancelSessionNotification`.
export const SessionCancelInput = z.strictObject({
  sessionId: z.string().min(1),
});
export type SessionCancelInput = z.infer<typeof SessionCancelInput>;

export const SessionCancelOutput = z.strictObject({});
export type SessionCancelOutput = z.infer<typeof SessionCancelOutput>;

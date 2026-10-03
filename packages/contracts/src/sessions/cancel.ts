import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.cancel`, after ACP `CancelSessionNotification`.
export const SessionCancelInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});
export type SessionCancelInput = z.infer<typeof SessionCancelInput>;

export const SessionCancelOutput = z.strictObject({});
export type SessionCancelOutput = z.infer<typeof SessionCancelOutput>;

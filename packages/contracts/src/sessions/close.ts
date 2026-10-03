import { z } from 'zod';

// Input of `session.close`, after ACP `CloseSessionRequest`.
export const SessionCloseInput = z.strictObject({
  sessionId: z.string().min(1),
});
export type SessionCloseInput = z.infer<typeof SessionCloseInput>;

export const SessionCloseOutput = z.strictObject({});
export type SessionCloseOutput = z.infer<typeof SessionCloseOutput>;

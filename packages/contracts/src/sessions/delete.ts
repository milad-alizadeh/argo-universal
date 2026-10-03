import { z } from 'zod';

// Input of `session.delete`, after ACP `DeleteSessionRequest`.
export const SessionDeleteInput = z.strictObject({
  sessionId: z.string().min(1),
});
export type SessionDeleteInput = z.infer<typeof SessionDeleteInput>;

export const SessionDeleteOutput = z.strictObject({});
export type SessionDeleteOutput = z.infer<typeof SessionDeleteOutput>;

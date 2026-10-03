import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.delete`, after ACP `DeleteSessionRequest`.
export const SessionDeleteInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});
export type SessionDeleteInput = z.infer<typeof SessionDeleteInput>;

export const SessionDeleteOutput = z.strictObject({});
export type SessionDeleteOutput = z.infer<typeof SessionDeleteOutput>;

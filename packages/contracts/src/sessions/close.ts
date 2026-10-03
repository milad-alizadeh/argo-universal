import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.close`, after ACP `CloseSessionRequest`.
export const SessionCloseInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});
export type SessionCloseInput = z.infer<typeof SessionCloseInput>;

export const SessionCloseOutput = z.strictObject({});
export type SessionCloseOutput = z.infer<typeof SessionCloseOutput>;

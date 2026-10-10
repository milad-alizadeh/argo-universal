import { z } from 'zod';
import { sessionColumns } from '../columns';

export const SessionAnswerPermissionInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  requestId: z.string(),
  optionId: z.string(),
  message: z.string().optional(),
});
export type SessionAnswerPermissionInput = z.infer<
  typeof SessionAnswerPermissionInput
>;

export const SessionAnswerPermissionOutput = z.strictObject({});
export type SessionAnswerPermissionOutput = z.infer<
  typeof SessionAnswerPermissionOutput
>;

import { z } from 'zod';
import { sessionColumns } from '../columns';
import { PermissionOptionKind } from './snapshot';

export const SessionAnswerPermissionInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  toolCallId: z.string(),
  optionId: PermissionOptionKind,
  message: z.string().optional(),
});
export type SessionAnswerPermissionInput = z.infer<
  typeof SessionAnswerPermissionInput
>;

export const SessionAnswerPermissionOutput = z.strictObject({});
export type SessionAnswerPermissionOutput = z.infer<
  typeof SessionAnswerPermissionOutput
>;

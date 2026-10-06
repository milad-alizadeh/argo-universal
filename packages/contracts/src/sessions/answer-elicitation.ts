import { z } from 'zod';
import { sessionColumns } from '../columns';

export const SessionAnswerElicitationInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  requestId: z.string(),
  action: z.enum(['accept', 'decline', 'cancel']),
  content: z.record(z.string(), z.unknown()).optional(),
});
export type SessionAnswerElicitationInput = z.infer<
  typeof SessionAnswerElicitationInput
>;

export const SessionAnswerElicitationOutput = z.strictObject({});
export type SessionAnswerElicitationOutput = z.infer<
  typeof SessionAnswerElicitationOutput
>;

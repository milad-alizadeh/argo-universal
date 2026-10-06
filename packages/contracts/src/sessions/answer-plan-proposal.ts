import { z } from 'zod';
import { sessionColumns } from '../columns';

const proposal = { sessionId: sessionColumns.shape.id, planId: z.string() };

export const SessionAnswerPlanProposalInput = z.discriminatedUnion('decision', [
  z.strictObject({
    ...proposal,
    decision: z.literal('approve'),
    feedback: z.string().optional(),
  }),
  z.strictObject({
    ...proposal,
    decision: z.literal('keep_planning'),
    feedback: z.string(),
  }),
]);
export type SessionAnswerPlanProposalInput = z.infer<
  typeof SessionAnswerPlanProposalInput
>;

export const SessionAnswerPlanProposalOutput = z.strictObject({});
export type SessionAnswerPlanProposalOutput = z.infer<
  typeof SessionAnswerPlanProposalOutput
>;

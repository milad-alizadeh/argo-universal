import { z } from 'zod';
import { sessionColumns } from '../columns';

// Input of `session.savePlan`: a plan's Markdown, saved as a file in the Session's Checkout.
export const SessionSavePlanInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  plan: z.string().min(1),
});

export type SessionSavePlanInput = z.infer<typeof SessionSavePlanInput>;

// Where the plan went, relative to the Checkout.
export const SessionSavePlanOutput = z.strictObject({ path: z.string() });

export type SessionSavePlanOutput = z.infer<typeof SessionSavePlanOutput>;

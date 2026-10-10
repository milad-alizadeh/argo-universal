import { z } from 'zod';
import { createFeedMetadataSchema } from './metadata';

const PlanEntryPriority = z.enum(['high', 'medium', 'low']);

const PlanEntryStatus = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const PlanEntry = z.strictObject({
  content: z.string(),
  priority: PlanEntryPriority,
  status: PlanEntryStatus,
  _meta: createFeedMetadataSchema(
    z.strictObject({ activeForm: z.string().optional() }),
  ),
});
export type PlanEntry = z.infer<typeof PlanEntry>;

// The Plan: the Agent's live checklist.
const PlanItems = z.strictObject({
  type: z.literal('items'),
  planId: z.string(),
  entries: z.array(PlanEntry),
  _meta: createFeedMetadataSchema(z.strictObject({})),
});

// A Plan proposal: a written plan that the user approves or rejects.
export const PlanMarkdown = z.strictObject({
  type: z.literal('markdown'),
  planId: z.string(),
  content: z.string(),
  _meta: createFeedMetadataSchema(
    z.strictObject({
      requestId: z.string().optional(),
      filePath: z.string().optional(),
      proposalOutcome: z.enum(['approved', 'kept_planning']).optional(),
    }),
  ),
});
export type PlanMarkdown = z.infer<typeof PlanMarkdown>;

const PlanFile = z.strictObject({
  type: z.literal('file'),
  planId: z.string(),
  uri: z.string(),
  _meta: createFeedMetadataSchema(z.strictObject({})),
});

export const Plan = z.discriminatedUnion('type', [
  PlanItems,
  PlanMarkdown,
  PlanFile,
]);
export type Plan = z.infer<typeof Plan>;

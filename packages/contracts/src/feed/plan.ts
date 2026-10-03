import { z } from 'zod';

export const PlanEntryPriority = z.enum(['high', 'medium', 'low']);
export type PlanEntryPriority = z.infer<typeof PlanEntryPriority>;

export const PlanEntryStatus = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);
export type PlanEntryStatus = z.infer<typeof PlanEntryStatus>;

export const PlanEntry = z.strictObject({
  content: z.string(),
  priority: PlanEntryPriority,
  status: PlanEntryStatus,
  _meta: z
    .strictObject({
      argo: z.strictObject({ activeForm: z.string().optional() }).optional(),
    })
    .optional(),
});
export type PlanEntry = z.infer<typeof PlanEntry>;

// The Plan: the Agent's live checklist.
export const PlanItems = z.strictObject({
  type: z.literal('items'),
  planId: z.string().min(1),
  entries: z.array(PlanEntry),
});
export type PlanItems = z.infer<typeof PlanItems>;

// A Plan proposal: a written plan that the user approves or rejects.
export const PlanMarkdown = z.strictObject({
  type: z.literal('markdown'),
  planId: z.string().min(1),
  content: z.string(),
  _meta: z
    .strictObject({
      argo: z
        .strictObject({
          requestId: z.string().min(1).optional(),
          filePath: z.string().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});
export type PlanMarkdown = z.infer<typeof PlanMarkdown>;

export const Plan = z.discriminatedUnion('type', [PlanItems, PlanMarkdown]);
export type Plan = z.infer<typeof Plan>;

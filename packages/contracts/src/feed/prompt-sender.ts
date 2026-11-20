import { z } from 'zod';
import { sessionColumns } from '../columns';

export const NonUserPromptSender = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('session'),
    sessionId: sessionColumns.shape.id,
    title: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal('plugin'),
    pluginId: z.string(),
    title: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal('schedule'),
    scheduleId: z.string(),
    title: z.literal('Schedule'),
  }),
  // The Voice call (ADR-0064): its Prompts are stored and never drawn.
  z.strictObject({ type: z.literal('voice') }),
]);

export type NonUserPromptSender = z.infer<typeof NonUserPromptSender>;

export const PromptSender = z.union([
  z.strictObject({ type: z.literal('user') }),
  NonUserPromptSender,
]);

export type PromptSender = z.infer<typeof PromptSender>;

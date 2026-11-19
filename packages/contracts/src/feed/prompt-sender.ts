import { z } from 'zod';
import { sessionColumns } from '../columns';

export const SentPromptSender = z.discriminatedUnion('type', [
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
  // The Voice call (ADR-0064): its Prompts are stored and never drawn.
  z.strictObject({ type: z.literal('voice') }),
]);

export type SentPromptSender = z.infer<typeof SentPromptSender>;

export const PromptSender = z.union([
  z.strictObject({ type: z.literal('user') }),
  SentPromptSender,
]);

export type PromptSender = z.infer<typeof PromptSender>;

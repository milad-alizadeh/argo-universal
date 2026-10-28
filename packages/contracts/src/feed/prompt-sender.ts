import { z } from 'zod';

export const NonUserPromptSender = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('session'),
    sessionId: z.string(),
    title: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal('plugin'),
    pluginId: z.string(),
    title: z.string().min(1),
  }),
]);

export type NonUserPromptSender = z.infer<typeof NonUserPromptSender>;

export const PromptSender = z.union([
  z.strictObject({ type: z.literal('user') }),
  NonUserPromptSender,
]);

export type PromptSender = z.infer<typeof PromptSender>;

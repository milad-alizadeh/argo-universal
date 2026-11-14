import { z } from 'zod';
import { SessionPromptInput } from './prompt';

export const QueuedPrompt = z.strictObject({
  id: z.string(),
  prompt: SessionPromptInput.shape.prompt,
  revision: z.int().nonnegative(),
});

export type QueuedPrompt = z.infer<typeof QueuedPrompt>;

export const PromptQueue = z.strictObject({
  items: z.array(QueuedPrompt),
  pauseReason: z.string().nullable(),
});

export type PromptQueue = z.infer<typeof PromptQueue>;

export const emptyPromptQueue = (): PromptQueue => ({
  items: [],
  pauseReason: null,
});

export const QueueCommand = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('append'),
    prompt: SessionPromptInput.shape.prompt,
  }),
  z.strictObject({
    action: z.literal('hold'),
    id: z.string(),
    revision: z.int(),
    token: z.string().min(1),
  }),
  z.strictObject({
    action: z.literal('save'),
    id: z.string(),
    revision: z.int(),
    token: z.string(),
    prompt: SessionPromptInput.shape.prompt,
  }),
  z.strictObject({
    action: z.literal('release'),
    id: z.string(),
    token: z.string(),
  }),
  z.strictObject({
    action: z.literal('delete'),
    id: z.string(),
    revision: z.int(),
  }),
  z.strictObject({
    action: z.literal('move'),
    id: z.string(),
    revision: z.int(),
    beforeId: z.string().nullable(),
  }),
  z.strictObject({ action: z.literal('resume') }),
]);

export type QueueCommand = z.infer<typeof QueueCommand>;

export const SessionQueueInput = z.strictObject({
  sessionId: SessionPromptInput.shape.sessionId,
  command: QueueCommand,
});

export type SessionQueueInput = z.infer<typeof SessionQueueInput>;

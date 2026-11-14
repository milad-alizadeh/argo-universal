import { z } from 'zod';
import { SessionPromptInput } from './prompt';

export const QueuedPromptId = z.string().min(1).brand<'QueuedPromptId'>();

export type QueuedPromptId = z.infer<typeof QueuedPromptId>;

export const QueueEditToken = z.string().min(1).brand<'QueueEditToken'>();

export type QueueEditToken = z.infer<typeof QueueEditToken>;

export const QueuedPrompt = z.strictObject({
  id: QueuedPromptId,
  prompt: SessionPromptInput.shape.prompt,
  revision: z.int().nonnegative(),
  followUpSuggestions: SessionPromptInput.shape.followUpSuggestions,
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
    followUpSuggestions: SessionPromptInput.shape.followUpSuggestions,
  }),
  z.strictObject({
    action: z.literal('hold'),
    id: QueuedPromptId,
    revision: z.int(),
    token: QueueEditToken,
  }),
  z.strictObject({
    action: z.literal('save'),
    id: QueuedPromptId,
    revision: z.int(),
    token: QueueEditToken,
    prompt: SessionPromptInput.shape.prompt,
  }),
  z.strictObject({
    action: z.literal('release'),
    id: QueuedPromptId,
    token: QueueEditToken,
  }),
  z.strictObject({
    action: z.literal('delete'),
    id: QueuedPromptId,
    revision: z.int(),
  }),
  z.strictObject({
    action: z.literal('move'),
    id: QueuedPromptId,
    revision: z.int(),
    beforeId: QueuedPromptId.nullable(),
  }),
  z.strictObject({ action: z.literal('resume') }),
]);

export type QueueCommand = z.infer<typeof QueueCommand>;

export const SessionQueueInput = z.strictObject({
  sessionId: SessionPromptInput.shape.sessionId,
  command: QueueCommand,
});

export type SessionQueueInput = z.infer<typeof SessionQueueInput>;

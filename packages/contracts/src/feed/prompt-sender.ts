import { z } from 'zod';
import { sessionColumns } from '../columns';

export const SentPromptSender = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('session'),
    sessionId: sessionColumns.shape.id,
    followThrough: z.string().min(1).optional(),
    delegatedResult: z.array(z.string()).min(1).optional(),
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
  z.strictObject({
    type: z.literal('skill'),
    title: z.literal('Confirmed skill'),
    offerId: z.string(),
    sessionId: sessionColumns.shape.id,
    originTurnId: z.string(),
  }),
  // The Conversation (ADR-0064): its Prompts are stored and never drawn.
  z.strictObject({ type: z.literal('conversation') }),
]);

export type SentPromptSender = z.infer<typeof SentPromptSender>;

export const PromptSender = z.union([
  z.strictObject({ type: z.literal('user') }),
  SentPromptSender,
]);

export type PromptSender = z.infer<typeof PromptSender>;

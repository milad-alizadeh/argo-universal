import { z } from 'zod';
import { sessionColumns } from '../columns';

const sessionSender = {
  type: z.literal('session'),
  sessionId: sessionColumns.shape.id,
  title: z.string().min(1),
};

export const SentPromptSender = z.union([
  z.strictObject({
    ...sessionSender,
    followThrough: z.string().min(1).optional(),
    delegatedResult: z.never().optional(),
  }),
  z.strictObject({
    ...sessionSender,
    delegatedResult: z.array(z.string()).min(1),
    followThrough: z.never().optional(),
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

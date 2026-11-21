import { z } from 'zod';
import { sessionColumns } from '../columns';
import { ContentBlock } from '../feed/content-block';

// Input of `session.prompt`, after ACP `PromptRequest`.
export const SessionPromptInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  prompt: z.array(ContentBlock).min(1),
  followThrough: z
    .boolean()
    .optional()
    .describe(
      'Deliver the Turn result to the caller. Requires the caller to have started this Session.',
    ),
  followUpSuggestions: z.boolean().optional(),
});

export type SessionPromptInput = z.infer<typeof SessionPromptInput>;

export const SessionSubmitInput = SessionPromptInput.extend({
  steer: z.boolean().optional(),
});

export type SessionSubmitInput = z.infer<typeof SessionSubmitInput>;

/*
 * Where the Prompt landed, acknowledged once saved; Agent completion arrives through the Session Feed. An idle Session
 * starts a Turn. A Session's Prompt to a busy Session is steered into the running Turn when its Agent can be steered,
 * and otherwise waits in the queue; `notSteered` says why one that could have steered waits (ADR-0054).
 */
export const SessionPromptOutput = z.union([
  z.strictObject({
    status: z.enum(['started', 'steered']),
    messageId: z.string(),
  }),
  // `messageId` is the Feed row the Prompt takes when its Turn starts.
  z.strictObject({
    status: z.literal('queued'),
    messageId: z.string(),
    notSteered: z.string().nullable(),
  }),
  // A Plugin's `prompt.submit` Hook dropped the prompt, so no Turn started; `drop` says why.
  z.strictObject({ messageId: z.null(), drop: z.string() }),
]);

export type SessionPromptOutput = z.infer<typeof SessionPromptOutput>;

import { z } from 'zod';
import { sessionColumns } from '../columns';
import { ContentBlock } from '../feed/content-block';

// Input of `session.prompt`, after ACP `PromptRequest`.
export const SessionPromptInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  prompt: z.array(ContentBlock).min(1),
});
export type SessionPromptInput = z.infer<typeof SessionPromptInput>;

// Output of `session.prompt`, after ACP v2 `PromptResponse`: the id of the user message.
export const SessionPromptOutput = z.strictObject({
  messageId: z.string(),
});
export type SessionPromptOutput = z.infer<typeof SessionPromptOutput>;

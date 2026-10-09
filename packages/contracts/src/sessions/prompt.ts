import { z } from 'zod';
import { sessionColumns } from '../columns';
import { ContentBlock } from '../feed/content-block';

// Input of `session.prompt`, after ACP `PromptRequest`.
export const SessionPromptInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  prompt: z.array(ContentBlock).min(1),
});
export type SessionPromptInput = z.infer<typeof SessionPromptInput>;

// Local acknowledgement after saving the prompt; Agent completion arrives through the Session Feed.
export const SessionPromptOutput = z.strictObject({
  messageId: z.string(),
});
export type SessionPromptOutput = z.infer<typeof SessionPromptOutput>;

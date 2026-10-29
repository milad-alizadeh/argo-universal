import { z } from 'zod';
import { ContentBlock } from './content-block';
import { createFeedMetadataSchema } from './metadata';
import { NonUserPromptSender } from './prompt-sender';
import { envelope, kind, message } from './update-fields';

export const UserMessage = z.strictObject({
  ...envelope,
  sessionUpdate: kind('user_message'),
  ...message,
  _meta: createFeedMetadataSchema(
    z.strictObject({
      sender: z.strictObject({ type: z.literal('user') }).optional(),
    }),
  ),
});

// Argo-owned Prompt provenance is separate from ACP-reported Session messages (ADR-0044).
export const PromptMessage = z.strictObject({
  ...envelope,
  sessionUpdate: kind('prompt_message'),
  ...message,
  _meta: z.strictObject({
    argo: z.strictObject({ sender: NonUserPromptSender }),
  }),
});

export type PromptMessage = z.infer<typeof PromptMessage>;

export const SessionMessage = z.strictObject({
  ...envelope,
  sessionUpdate: kind('session_message'),
  messageId: z.string(),
  content: z.array(ContentBlock),
  _meta: createFeedMetadataSchema(
    z.strictObject({
      senderSessionId: z.string().optional(),
      recipientSessionId: z.string().optional(),
    }),
  ),
});

export type SessionMessage = z.infer<typeof SessionMessage>;

export type UserMessage = z.infer<typeof UserMessage>;

export const AgentMessage = z.strictObject({
  ...envelope,
  sessionUpdate: kind('agent_message'),
  ...message,
});

export type AgentMessage = z.infer<typeof AgentMessage>;

export const AgentThought = z.strictObject({
  ...envelope,
  sessionUpdate: kind('agent_thought'),
  ...message,
});

export type AgentThought = z.infer<typeof AgentThought>;

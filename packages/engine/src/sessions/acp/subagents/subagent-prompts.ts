import type { ChildFeed } from '../../subagents/child-feed';
import {
  type AcpSessionMessage,
  type MessageRouting,
  ownChild,
  previousPrompt,
  sendMessageAction,
} from './subagent-actions';
import { messageContent } from './subagent-content';

// A missing recipient never selects a child; a patch revises the prompt it already set.
const promptRecipient = (
  input: MessageRouting,
  update: AcpSessionMessage,
): ChildFeed | undefined =>
  previousPrompt(input, update.messageId)?.child ??
  ownChild(input, update.recipientSessionId);

// Only the transcript owner's outgoing message is a prompt; another sender's message is not.
const isOutgoing = (
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean =>
  update.senderSessionId == null ||
  update.senderSessionId === input.transcriptId;

function recordPrompt(
  input: MessageRouting,
  child: ChildFeed,
  update: AcpSessionMessage,
): void {
  const previous = previousPrompt(input, update.messageId)?.prompt;

  sendMessageAction(input, child, {
    messageId: update.messageId,
    field: { prompt: messageContent(update, previous) },
  });
}

export function deliverPrompt(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const child = promptRecipient(input, update);

  if (child && isOutgoing(input, update)) recordPrompt(input, child, update);

  return child !== undefined;
}

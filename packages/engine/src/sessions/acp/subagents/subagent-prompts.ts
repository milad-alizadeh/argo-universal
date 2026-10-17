import type { ChildFeed } from '../../subagents/child-feed';
import {
  type AcpSessionMessage,
  type ChildPrompt,
  type MessageAction,
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
  previous: ChildPrompt | undefined,
): ChildFeed | undefined =>
  previous?.child ?? ownChild(input, update.recipientSessionId);

// Only a message the transcript owner says it sent is a prompt; its later patches need not repeat the sender.
const isOutgoing = (
  input: MessageRouting,
  update: AcpSessionMessage,
  previous: ChildPrompt | undefined,
): boolean =>
  previous !== undefined || update.senderSessionId === input.transcriptId;

const promptAction = (
  update: AcpSessionMessage,
  previous: ChildPrompt | undefined,
): MessageAction => ({
  messageId: update.messageId,
  field: { prompt: messageContent(update, previous?.prompt) },
});

export function deliverPrompt(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const previous = previousPrompt(input, update.messageId);
  const child = promptRecipient(input, update, previous);

  if (child && isOutgoing(input, update, previous))
    sendMessageAction(input, child, promptAction(update, previous));

  return child !== undefined;
}

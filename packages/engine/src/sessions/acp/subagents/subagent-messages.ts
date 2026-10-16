import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  ContentBlock,
  SessionMessage,
  SessionUpdate,
  FeedUpdate,
} from '@repo/contracts';
import { mapSupportedContentBlock } from '../../../feed';
import type { ChildFeed } from '../../subagents/child-feed';
import type { SubagentRouting } from '../../subagents/routing-types';
import {
  type AcpSessionMessage,
  type MessageRouting,
  replyOf,
  sendMessageAction,
} from './subagent-actions';
import { messageMetadata } from './subagent-sender';

const messageId = (input: SubagentRouting, update: AcpSessionMessage): string =>
  JSON.stringify(['session_message', input.parentId, update.messageId]);

function previousMessage(
  child: ChildFeed,
  id: string,
): SessionMessage | undefined {
  const context = child.feed.getSnapshot().context;
  const row = context.rows[id] ?? context.findWrittenRow(id);

  return asSessionMessage(row);
}

function recipient(
  input: MessageRouting,
  update: AcpSessionMessage,
): ChildFeed | undefined {
  if (update.recipientSessionId)
    return input.children.get(update.recipientSessionId);

  return [...input.children.values()].find(
    (child) => previousMessage(child, messageId(input, update)) !== undefined,
  );
}

const asSessionMessage = (
  row: SessionUpdate | undefined,
): SessionMessage | undefined =>
  row?.sessionUpdate === 'session_message' ? row : undefined;

function replaceContent(
  update: Extract<AcpSessionMessage, { sessionUpdate: 'session_message' }>,
  previous: ContentBlock[],
): ContentBlock[] {
  if (update.content === undefined) return previous;

  return (update.content ?? []).map(mapSupportedContentBlock);
}

function messageContent(
  update: AcpSessionMessage,
  previous: ContentBlock[] = [],
): ContentBlock[] {
  if (update.sessionUpdate === 'session_message_chunk')
    return [...previous, mapSupportedContentBlock(update.content)];

  return replaceContent(update, previous);
}

export const isSubagentMessage = (
  update: SessionNotification['update'],
): update is AcpSessionMessage =>
  update.sessionUpdate === 'session_message' ||
  update.sessionUpdate === 'session_message_chunk';

function messageRow(
  input: MessageRouting,
  child: ChildFeed,
  update: AcpSessionMessage,
): DeliveredMessage {
  const previous = previousMessage(child, messageId(input, update));

  return {
    id: messageId(input, update),
    messageId: update.messageId,
    sessionUpdate: 'session_message',
    state: 'settled',
    content: messageContent(update, previous?.content),
    _meta: messageMetadata(input, update, previous),
  };
}

type DeliveredMessage = Extract<
  FeedUpdate,
  { sessionUpdate: 'session_message' }
>;

const senderOf = (row: DeliveredMessage): string | undefined =>
  row._meta?.argo?.senderSessionId;

const isOutgoing = (
  input: MessageRouting,
  child: ChildFeed,
  row: DeliveredMessage,
): boolean =>
  child.parentId === input.parentId && senderOf(row) === input.parentId;

// The parent's outgoing message to its own child is that child's prompt.
function recordPrompt(
  input: MessageRouting,
  child: ChildFeed,
  row: DeliveredMessage,
): void {
  if (!isOutgoing(input, child, row)) return;
  sendMessageAction(input, child, {
    messageId: row.messageId,
    field: { prompt: row.content },
  });
}

function deliverPrompt(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const child = recipient(input, update);

  if (!child) return false;

  const row = messageRow(input, child, update);

  child.feed.send({
    type: 'feed.change',
    turnId: child.turnId,
    change: { type: 'upsert', update: row },
  });
  recordPrompt(input, child, row);

  return true;
}

function deliverResult(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const reply = replyOf(input, update);

  if (!reply) return false;

  sendMessageAction(input, reply.child, {
    messageId: update.messageId,
    field: { result: messageContent(update, reply.previous) },
  });

  return true;
}

// A result routes first: a child's reply also names a recipient, which `deliverPrompt` would misread.
export const deliverSubagentMessage = (
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean => deliverResult(input, update) || deliverPrompt(input, update);

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
  previousResult,
  replier,
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
): Extract<FeedUpdate, { sessionUpdate: 'session_message' }> {
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

// The parent's outgoing message to its own child is that child's prompt.
function deliverPrompt(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const child = recipient(input, update);

  if (!child) return false;

  const row = messageRow(input, child, update);
  const prompt = row.content;

  child.feed.send({
    type: 'feed.change',
    turnId: child.turnId,
    change: { type: 'upsert', update: row },
  });

  if (isOutgoing(input, child, row))
    sendMessageAction(input, child, update.messageId, { prompt });

  return true;
}

const senderOf = (row: Pick<SessionMessage, '_meta'>): string | undefined =>
  row._meta?.argo?.senderSessionId;

const isOutgoing = (
  input: MessageRouting,
  child: ChildFeed,
  row: Pick<SessionMessage, '_meta'>,
): boolean =>
  child.parentId === input.parentId && senderOf(row) === input.parentId;

function deliverResult(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const previous = previousResult(input, update.messageId);
  const child = replier(input, update, previous);

  if (!child) return false;

  const result = messageContent(update, previous?._meta?.argo?.result);

  sendMessageAction(input, child, update.messageId, { result });

  return true;
}

// A result comes first: a child's reply on the parent transcript also names the
// parent as recipient, which `deliverPrompt` would otherwise misread as a prompt.
export const deliverSubagentMessage = (
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean => deliverResult(input, update) || deliverPrompt(input, update);

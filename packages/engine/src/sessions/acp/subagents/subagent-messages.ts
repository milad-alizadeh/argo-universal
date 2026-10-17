import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  SessionMessage,
  SessionUpdate,
  FeedUpdate,
} from '@repo/contracts';
import type { ChildFeed } from '../../subagents/child-feed';
import {
  type AcpSessionMessage,
  type MessageRouting,
  replyOf,
  sendMessageAction,
} from './subagent-actions';
import { messageContent } from './subagent-content';
import { deliverPrompt } from './subagent-prompts';
import { messageMetadata } from './subagent-sender';

// `parentId` names the Session whose transcript reported the message, so ids never match across transcripts.
const messageId = (input: MessageRouting, update: AcpSessionMessage): string =>
  JSON.stringify(['session_message', input.parentId, update.messageId]);

function previousMessage(
  input: MessageRouting,
  id: string,
): SessionMessage | undefined {
  const context = input.parentFeed.getSnapshot().context;
  const row = context.rows[id] ?? context.findWrittenRow(id);

  return asSessionMessage(row);
}

const asSessionMessage = (
  row: SessionUpdate | undefined,
): SessionMessage | undefined =>
  row?.sessionUpdate === 'session_message' ? row : undefined;

export const isSubagentMessage = (
  update: SessionNotification['update'],
): update is AcpSessionMessage =>
  update.sessionUpdate === 'session_message' ||
  update.sessionUpdate === 'session_message_chunk';

type DeliveredMessage = Extract<
  FeedUpdate,
  { sessionUpdate: 'session_message' }
>;

function messageRow(
  input: MessageRouting,
  update: AcpSessionMessage,
): DeliveredMessage {
  const id = messageId(input, update);
  const previous = previousMessage(input, id);

  return {
    id,
    messageId: update.messageId,
    sessionUpdate: 'session_message',
    state: 'settled',
    content: messageContent(update, previous?.content),
    _meta: messageMetadata(input, update, previous),
  };
}

// On a child's transcript the routing's `parentFeed` is that child's Feed.
function writeChildRow(
  input: MessageRouting,
  child: ChildFeed,
  update: AcpSessionMessage,
): void {
  child.feed.send({
    type: 'feed.change',
    turnId: child.turnId,
    change: { type: 'upsert', update: messageRow(input, update) },
  });
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
const deliverAction = (
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean => deliverResult(input, update) || deliverPrompt(input, update);

/**
 * A `session_message` is a row only in the Feed of the child whose transcript reported it (ACP subagents RFD).
 * On the parent's transcript it only sets a `subagent_update` prompt or result (#930).
 * `false` keeps the message until its transcript or recipient is associated.
 */
export function deliverSubagentMessage(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const child = input.children.get(input.transcriptId);

  if (child) {
    writeChildRow(input, child, update);
    deliverAction(input, update);

    return true;
  }

  if (input.transcriptId !== input.parent.vendorSessionId) return false;

  return deliverAction(input, update);
}

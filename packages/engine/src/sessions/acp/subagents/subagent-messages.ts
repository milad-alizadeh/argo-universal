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
  messageContent,
  sendMessageAction,
} from './subagent-actions';
import { promptOf, replyOf } from './subagent-participants';
import { messageMetadata } from './subagent-sender';

// Message ids are scoped to their transcript (ACP subagents RFD), so a row never matches across Feeds.
const messageId = (child: ChildFeed, update: AcpSessionMessage): string =>
  JSON.stringify(['session_message', child.sessionId, update.messageId]);

function previousMessage(
  child: ChildFeed,
  id: string,
): SessionMessage | undefined {
  const context = child.feed.getSnapshot().context;
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
  child: ChildFeed,
  update: AcpSessionMessage,
): DeliveredMessage {
  const previous = previousMessage(child, messageId(child, update));

  return {
    id: messageId(child, update),
    messageId: update.messageId,
    sessionUpdate: 'session_message',
    state: 'settled',
    content: messageContent(update, previous?.content),
    _meta: messageMetadata(input, update, previous),
  };
}

// A Subagent's Feed holds only the messages its own transcript reports; nothing is copied from another view.
function recordTranscriptMessage(
  input: MessageRouting,
  child: ChildFeed,
  update: AcpSessionMessage,
): void {
  child.feed.send({
    type: 'feed.change',
    turnId: child.turnId,
    change: { type: 'upsert', update: messageRow(input, child, update) },
  });
}

// This transcript's outgoing message to its own child is that child's prompt.
function recordPrompt(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const prompt = promptOf(input, update);

  if (!prompt) return false;

  sendMessageAction(input, prompt.child, {
    messageId: update.messageId,
    field: { prompt: messageContent(update, prompt.previous) },
  });

  return true;
}

function recordResult(
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

// A result routes first: a child's reply also names a recipient, which `recordPrompt` would misread.
function recordAction(input: MessageRouting, update: AcpSessionMessage): void {
  if (recordResult(input, update)) return;
  recordPrompt(input, update);
}

const isRootTranscript = (input: MessageRouting): boolean =>
  input.transcriptId === input.parent.vendorSessionId;

/*
 * A message on the root or a known child transcript is delivered now.
 * One on a transcript no Session owns yet returns false and waits for its announcement.
 */
export function deliverSubagentMessage(
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean {
  const child = input.children.get(input.transcriptId);

  if (child) recordTranscriptMessage(input, child, update);
  else if (!isRootTranscript(input)) return false;
  recordAction(input, update);

  return true;
}

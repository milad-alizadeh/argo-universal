import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  SessionMessage,
  SessionUpdate,
  FeedUpdate,
} from '@repo/contracts';
import { mapSupportedContentBlock } from '../../feed';
import type { ChildFeed } from '../subagents/child-feed';
import type { SubagentRouting } from '../subagents/routing-types';

type Message = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'session_message' | 'session_message_chunk' }
>;

type MessageRouting = SubagentRouting;

const messageId = (input: SubagentRouting, update: Message): string =>
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
  children: ReadonlyMap<string, ChildFeed>,
  update: Message,
): ChildFeed | undefined {
  if (update.recipientSessionId) return children.get(update.recipientSessionId);

  return [...children.values()].find(
    (child) => previousMessage(child, messageId(input, update)) !== undefined,
  );
}

const asSessionMessage = (
  row: SessionUpdate | undefined,
): SessionMessage | undefined =>
  row?.sessionUpdate === 'session_message' ? row : undefined;

const previousContent = (
  previous: SessionMessage | undefined,
): SessionMessage['content'] => previous?.content ?? [];

function replaceContent(
  update: Extract<Message, { sessionUpdate: 'session_message' }>,
  previous: SessionMessage | undefined,
): SessionMessage['content'] {
  if (update.content === undefined) return previousContent(previous);

  return (update.content ?? []).map(mapSupportedContentBlock);
}

function messageContent(
  update: Message,
  previous: SessionMessage | undefined,
): SessionMessage['content'] {
  if (update.sessionUpdate === 'session_message_chunk')
    return [
      ...previousContent(previous),
      mapSupportedContentBlock(update.content),
    ];

  return replaceContent(update, previous);
}

export const isSubagentMessage = (
  update: SessionNotification['update'],
): update is Message =>
  update.sessionUpdate === 'session_message' ||
  update.sessionUpdate === 'session_message_chunk';

function messageRow(
  input: MessageRouting,
  child: ChildFeed,
  update: Message,
): FeedUpdate {
  const id = messageId(input, update);

  return {
    id,
    messageId: update.messageId,
    sessionUpdate: 'session_message',
    state: 'settled',
    content: messageContent(update, previousMessage(child, id)),
    _meta: { argo: { senderSessionId: input.parentId } },
  };
}

export function deliverSubagentMessage(
  input: MessageRouting,
  children: ReadonlyMap<string, ChildFeed>,
  update: Message,
): boolean {
  const child = recipient(input, children, update);

  if (!child) return false;
  child.feed.send({
    type: 'feed.change',
    turnId: child.turnId,
    change: { type: 'upsert', update: messageRow(input, child, update) },
  });

  return true;
}

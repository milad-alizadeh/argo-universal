import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { SessionMessage } from '@repo/contracts';
import type { ChildFeed } from '../subagents/child-feed';
import type { SubagentRouting } from '../subagents/routing-types';

type Message = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'session_message' | 'session_message_chunk' }
>;

export type MessageSender = SubagentRouting & {
  children: ReadonlyMap<string, ChildFeed>;
};

type MessageMetadata = SessionMessage['_meta'];

const previousSender = (metadata: MessageMetadata): string | undefined =>
  metadata?.argo?.senderSessionId;

const knownSender = (
  input: MessageSender,
  acpId: string,
): string | undefined =>
  acpId === input.parent.vendorSessionId
    ? input.parent.sessionId
    : input.children.get(acpId)?.sessionId;

function resolveSender(
  input: MessageSender,
  update: Message,
  previous: SessionMessage | undefined,
): string | undefined {
  if (update.senderSessionId != null)
    return knownSender(input, update.senderSessionId);

  if (previous) return previousSender(previous._meta);

  return input.parentId;
}

export function messageMetadata(
  input: MessageSender,
  update: Message,
  previous: SessionMessage | undefined,
): MessageMetadata {
  const senderSessionId = resolveSender(input, update, previous);

  return senderSessionId ? { argo: { senderSessionId } } : undefined;
}

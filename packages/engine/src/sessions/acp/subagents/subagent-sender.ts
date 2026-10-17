import type { SessionMessage } from '@repo/contracts';
import type { ChildFeed } from '../../subagents/child-feed';
import type { SubagentRouting } from '../../subagents/routing-types';
import type { AcpSessionMessage } from './subagent-actions';

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

// Only a sender the Agent supplied; a missing one stays missing.
function resolveSender(
  input: MessageSender,
  update: AcpSessionMessage,
  previous: SessionMessage | undefined,
): string | undefined {
  if (update.senderSessionId != null)
    return knownSender(input, update.senderSessionId);

  return previousSender(previous?._meta);
}

export function messageMetadata(
  input: MessageSender,
  update: AcpSessionMessage,
  previous: SessionMessage | undefined,
): MessageMetadata {
  const senderSessionId = resolveSender(input, update, previous);

  return senderSessionId ? { argo: { senderSessionId } } : undefined;
}

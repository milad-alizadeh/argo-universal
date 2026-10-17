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

const suppliedSender = (
  input: MessageSender,
  update: AcpSessionMessage,
): string | undefined =>
  update.senderSessionId == null
    ? undefined
    : knownSender(input, update.senderSessionId);

// Only a sender the Agent supplied is recorded, and kept across later patches; a missing one stays missing.
const resolveSender = (
  input: MessageSender,
  update: AcpSessionMessage,
  previous: SessionMessage | undefined,
): string | undefined =>
  suppliedSender(input, update) ?? previousSender(previous?._meta);

export function messageMetadata(
  input: MessageSender,
  update: AcpSessionMessage,
  previous: SessionMessage | undefined,
): MessageMetadata {
  const senderSessionId = resolveSender(input, update, previous);

  return senderSessionId ? { argo: { senderSessionId } } : undefined;
}

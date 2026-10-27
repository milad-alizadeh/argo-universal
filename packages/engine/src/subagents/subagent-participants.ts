import type { SessionMessage } from '@repo/contracts';
import type { ChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';
import type { AcpSessionMessage } from './subagent-actions';

export type MessageParticipants = SubagentRouting & {
  children: ReadonlyMap<string, ChildFeed>;
};

type MessageMetadata = SessionMessage['_meta'];

type Participant = 'senderSessionId' | 'recipientSessionId';

const previousParticipant = (
  metadata: MessageMetadata,
  key: Participant,
): string | undefined => metadata?.argo?.[key];

const knownSession = (
  input: MessageParticipants,
  acpId: string,
): string | undefined =>
  acpId === input.parent.vendorSessionId
    ? input.parent.sessionId
    : input.children.get(acpId)?.sessionId;

const suppliedParticipant = (
  input: MessageParticipants,
  acpId: string | null | undefined,
): string | undefined =>
  acpId == null ? undefined : knownSession(input, acpId);

type MessageChange = {
  update: AcpSessionMessage;
  previous: SessionMessage | undefined;
};

// Only an id the Agent supplied, mapped to its Session and kept across patches (ACP subagents RFD); a missing one stays missing.
const resolveParticipant = (
  input: MessageParticipants,
  { update, previous }: MessageChange,
  key: Participant,
): string | undefined =>
  suppliedParticipant(input, update[key]) ??
  previousParticipant(previous?._meta, key);

export function messageMetadata(
  input: MessageParticipants,
  update: AcpSessionMessage,
  previous: SessionMessage | undefined,
): MessageMetadata {
  const change = { update, previous };

  const senderSessionId = resolveParticipant(input, change, 'senderSessionId');

  const recipientSessionId = resolveParticipant(
    input,
    change,
    'recipientSessionId',
  );

  if (!senderSessionId && !recipientSessionId) return undefined;

  return { argo: { senderSessionId, recipientSessionId } };
}

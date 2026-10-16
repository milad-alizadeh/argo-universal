import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  ContentBlock,
  FeedUpdate,
  SessionUpdate,
  SubagentUpdate,
} from '@repo/contracts';
import type { FeedActorRef } from '../../../feed';
import type { ChildFeed } from '../../subagents/child-feed';
import type { SubagentRouting } from '../../subagents/routing-types';

// An ACP subagents RFD message, whole or as a chunk.
export type AcpSessionMessage = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'session_message' | 'session_message_chunk' }
>;

// `transcriptId` is the ACP id of the transcript a message updates, which names its receiving Session.
export type MessageRouting = SubagentRouting & {
  children: ReadonlyMap<string, ChildFeed>;
  transcriptId: string;
};

// Only the parent's outgoing `prompt` is a `message` action; a child's explicit `result` carries no action (#930).
type MessageField = { prompt: ContentBlock[] } | { result: ContentBlock[] };

// One row per message in the parent transcript, so its patches and chunks revise it.
const actionId = (input: SubagentRouting, messageId: string): string =>
  JSON.stringify(['subagent_update', input.parentId, messageId]);

function writtenRow(feed: FeedActorRef, id: string): SessionUpdate | undefined {
  const context = feed.getSnapshot().context;

  return context.rows[id] ?? context.findWrittenRow(id);
}

// The result row this message already revises, if any.
export function previousResult(
  input: MessageRouting,
  messageId: string,
): SubagentUpdate | undefined {
  const row = writtenRow(input.parentFeed, actionId(input, messageId));

  if (row?.sessionUpdate !== 'subagent_update') return undefined;

  return row._meta?.argo?.result ? row : undefined;
}

const argoField = (field: MessageField): SubagentUpdate['_meta'] =>
  'prompt' in field
    ? { argo: { action: 'message', ...field } }
    : { argo: field };

const messageActionRow = (
  input: SubagentRouting,
  child: ChildFeed,
  messageId: string,
  field: MessageField,
): FeedUpdate => ({
  id: actionId(input, messageId),
  sessionUpdate: 'subagent_update',
  state: 'settled',
  subagentSessionId: child.sessionId,
  _meta: argoField(field),
});

export function sendMessageAction(
  input: SubagentRouting,
  child: ChildFeed,
  messageId: string,
  field: MessageField,
): void {
  input.parentFeed.send({
    type: 'feed.change',
    turnId: null,
    change: {
      type: 'upsert',
      update: messageActionRow(input, child, messageId, field),
    },
  });
}

function ownChild(
  input: MessageRouting,
  vendorId: string | null | undefined,
): ChildFeed | undefined {
  const child = vendorId ? input.children.get(vendorId) : undefined;

  return child?.parentId === input.parentId ? child : undefined;
}

// Only a reply that names its child sender and this transcript's Session as recipient is a result.
const explicitReplier = (
  input: MessageRouting,
  update: AcpSessionMessage,
): ChildFeed | undefined =>
  update.recipientSessionId === input.transcriptId
    ? ownChild(input, update.senderSessionId)
    : undefined;

const childById = (
  input: MessageRouting,
  row: SubagentUpdate,
): ChildFeed | undefined =>
  [...input.children.values()].find(
    (child) => child.sessionId === row.subagentSessionId,
  );

// A chunk or patch of a known result names no sender, so its result row names the child.
export const replier = (
  input: MessageRouting,
  update: AcpSessionMessage,
  previous: SubagentUpdate | undefined,
): ChildFeed | undefined =>
  previous ? childById(input, previous) : explicitReplier(input, update);

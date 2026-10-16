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

export type Message = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'session_message' | 'session_message_chunk' }
>;

// `transcriptId` is the ACP id of the transcript a message updates, which names its receiving Session.
export type MessageRouting = SubagentRouting & {
  children: ReadonlyMap<string, ChildFeed>;
  transcriptId: string;
};

type MessageAction = {
  messageId: string;
  field: { prompt: ContentBlock[] } | { result: ContentBlock[] };
};

// One row per message in the parent transcript, so its patches and chunks revise it.
const actionId = (input: SubagentRouting, messageId: string): string =>
  JSON.stringify(['subagent_update', input.parentId, messageId]);

function writtenRow(feed: FeedActorRef, id: string): SessionUpdate | undefined {
  const context = feed.getSnapshot().context;

  return context.rows[id] ?? context.findWrittenRow(id);
}

const asSubagentUpdate = (
  row: SessionUpdate | undefined,
): SubagentUpdate | undefined =>
  row?.sessionUpdate === 'subagent_update' ? row : undefined;

const resultOf = (row: SubagentUpdate): ContentBlock[] | undefined =>
  row._meta?.argo?.result;

// The result row this message already revises, if any.
export const previousResult = (
  input: MessageRouting,
  messageId: string,
): SubagentUpdate | undefined =>
  [
    asSubagentUpdate(writtenRow(input.parentFeed, actionId(input, messageId))),
  ].find((row) => row !== undefined && resultOf(row) !== undefined);

export const previousResultContent = (
  row: SubagentUpdate | undefined,
): ContentBlock[] | undefined => (row ? resultOf(row) : undefined);

const messageActionRow = (
  input: SubagentRouting,
  child: ChildFeed,
  { messageId, field }: MessageAction,
): FeedUpdate => ({
  id: actionId(input, messageId),
  sessionUpdate: 'subagent_update',
  state: 'settled',
  subagentSessionId: child.sessionId,
  _meta: { argo: { action: 'message', ...field } },
});

export function sendMessageAction(
  input: SubagentRouting,
  child: ChildFeed,
  action: MessageAction,
): void {
  input.parentFeed.send({
    type: 'feed.change',
    turnId: null,
    change: { type: 'upsert', update: messageActionRow(input, child, action) },
  });
}

const ownChild = (
  input: MessageRouting,
  vendorId: string | null | undefined,
): ChildFeed | undefined =>
  [input.children.get(vendorId ?? '')].find(
    (child) => child?.parentId === input.parentId,
  );

// Only a reply that names its child sender and this transcript's Session as recipient is a result.
const explicitReplier = (
  input: MessageRouting,
  update: Message,
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

export function replier(
  input: MessageRouting,
  update: Message,
): ChildFeed | undefined {
  const previous = previousResult(input, update.messageId);

  if (previous) return childById(input, previous);

  return explicitReplier(input, update);
}

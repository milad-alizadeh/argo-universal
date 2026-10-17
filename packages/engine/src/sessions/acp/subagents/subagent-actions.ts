import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  ContentBlock,
  FeedUpdate,
  SessionUpdate,
  SubagentUpdate,
} from '@repo/contracts';
import { mapSupportedContentBlock, type FeedActorRef } from '../../../feed';
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

type MessageAction = { messageId: string; field: MessageField };

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

export const resultField = (row: SubagentUpdate): ContentBlock[] | undefined =>
  row._meta?.argo?.result;

export const promptField = (row: SubagentUpdate): ContentBlock[] | undefined =>
  row._meta?.argo?.prompt;

export type FieldOf = (row: SubagentUpdate) => ContentBlock[] | undefined;

// The action row of this kind that the message already revises, if any.
export function previousAction(
  input: MessageRouting,
  messageId: string,
  fieldOf: FieldOf,
): SubagentUpdate | undefined {
  const update = asSubagentUpdate(
    writtenRow(input.parentFeed, actionId(input, messageId)),
  );

  return update && fieldOf(update) ? update : undefined;
}

const argoField = (field: MessageField): SubagentUpdate['_meta'] =>
  'prompt' in field
    ? { argo: { action: 'message', ...field } }
    : { argo: field };

const messageActionRow = (
  input: SubagentRouting,
  child: ChildFeed,
  { messageId, field }: MessageAction,
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
  action: MessageAction,
): void {
  input.parentFeed.send({
    type: 'feed.change',
    turnId: null,
    change: {
      type: 'upsert',
      update: messageActionRow(input, child, action),
    },
  });
}

function replaceContent(
  update: Extract<AcpSessionMessage, { sessionUpdate: 'session_message' }>,
  previous: ContentBlock[],
): ContentBlock[] {
  if (update.content === undefined) return previous;

  return (update.content ?? []).map(mapSupportedContentBlock);
}

export function messageContent(
  update: AcpSessionMessage,
  previous: ContentBlock[] = [],
): ContentBlock[] {
  if (update.sessionUpdate === 'session_message_chunk')
    return [...previous, mapSupportedContentBlock(update.content)];

  return replaceContent(update, previous);
}

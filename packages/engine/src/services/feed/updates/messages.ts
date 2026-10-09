import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedChange } from '@repo/contracts';
import type { Feed } from '../feed-change';

type MessageKind = 'agent_message' | 'agent_thought';
type MessageStream = {
  id: string;
  upstreamId: string | null;
  turnId: string | null;
};
export type MessageStreams = Partial<Record<MessageKind, MessageStream>>;
type MessageInput = {
  update: SessionNotification['update'];
  turnId: string | null;
  feed: Feed;
  streams: MessageStreams;
};
type MessageResult =
  | { change: FeedChange; streams: MessageStreams }
  | { rejection: string }
  | undefined;

type ChunkUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'agent_message_chunk' | 'agent_thought_chunk' }
>;
type TextMessage = { id: string; kind: MessageKind; text: string };
const isMessageChunk = (
  update: SessionNotification['update'],
): update is ChunkUpdate =>
  update.sessionUpdate === 'agent_message_chunk' ||
  update.sessionUpdate === 'agent_thought_chunk';
const matchesMessageIdentity = (
  stream: MessageStream,
  identity: Pick<MessageStream, 'turnId' | 'upstreamId'>,
): boolean =>
  stream.turnId === identity.turnId &&
  stream.upstreamId === identity.upstreamId;
const createMessageRowId = (
  input: MessageInput,
  kind: MessageKind,
  upstreamId: string | null,
): string =>
  JSON.stringify([
    kind,
    input.turnId,
    upstreamId ?? ['local', input.turnId, input.feed.nextPosition],
  ]);
const createMessageStream = (
  input: MessageInput,
  kind: MessageKind,
  upstreamId: string | null,
): MessageStream => ({
  id: createMessageRowId(input, kind, upstreamId),
  upstreamId,
  turnId: input.turnId,
});
const selectOrCreateMessageStream = (
  input: MessageInput,
  kind: MessageKind,
  upstreamId: string | null,
): MessageStream => {
  const previous = input.streams[kind];
  if (
    previous &&
    matchesMessageIdentity(previous, { turnId: input.turnId, upstreamId })
  )
    return previous;
  return createMessageStream(input, kind, upstreamId);
};
const createTextMessageRow = (message: TextMessage): FeedChange => ({
  type: 'upsert',
  update: {
    id: message.id,
    messageId: message.id,
    sessionUpdate: message.kind,
    state: 'open',
    content: [{ type: 'text', text: message.text }],
  },
});
const createTextMessageChange = (
  feed: Feed,
  message: TextMessage,
): FeedChange => {
  if (feed.rows[message.id])
    return {
      type: 'append',
      id: message.id,
      field: 'content.0.text',
      text: message.text,
    };
  return createTextMessageRow(message);
};
const createTextChunkChange = (
  input: MessageInput,
  kind: MessageKind,
  text: string,
): Exclude<MessageResult, { rejection: string } | undefined> => {
  const upstreamId = isMessageChunk(input.update)
    ? (input.update.messageId ?? null)
    : null;
  const stream = selectOrCreateMessageStream(input, kind, upstreamId);
  return {
    change: createTextMessageChange(input.feed, { id: stream.id, kind, text }),
    streams: { ...input.streams, [kind]: stream },
  };
};
const assembleTextChunk = (
  input: Omit<MessageInput, 'update'>,
  update: ChunkUpdate,
  text: string,
): MessageResult => {
  const kind =
    update.sessionUpdate === 'agent_message_chunk'
      ? 'agent_message'
      : 'agent_thought';
  return createTextChunkChange({ ...input, update }, kind, text);
};
export const assembleAcpMessage = (input: MessageInput): MessageResult => {
  if (!isMessageChunk(input.update)) return undefined;
  if (input.update.content.type !== 'text')
    return { rejection: 'Non-text ACP output is not enabled' };
  return assembleTextChunk(input, input.update, input.update.content.text);
};

import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  ContentBlock,
  FeedChange,
  FeedUpdate,
  SessionUpdate,
  TextContent,
} from '@repo/contracts';
import type {
  AssembledContent,
  ContentAssemblyInput,
  ContentAssemblyResult,
} from './assembly';
import {
  mapSupportedContentBlock,
  collectUnsupportedContentReasons,
} from './content';
import {
  selectMessageStream,
  type MessageKind,
  type MessageStream,
} from './message-identity';

type ChunkUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'agent_message_chunk' | 'agent_thought_chunk' }
>;
type MessageInput = ContentAssemblyInput & { update: ChunkUpdate };
type MessageRow = Extract<SessionUpdate, { sessionUpdate: MessageKind }>;
type MessageBlock = { kind: MessageKind; block: ContentBlock };
const isMessageChunk = (
  update: SessionNotification['update'],
): update is ChunkUpdate =>
  update.sessionUpdate === 'agent_message_chunk' ||
  update.sessionUpdate === 'agent_thought_chunk';
const hasUnannotatedTextTail = (row: MessageRow): boolean => {
  const last = row.content.at(-1);
  return last?.type === 'text' && !last._meta;
};
const canAppendTextContent = (
  row: MessageRow,
  block: ContentBlock,
): block is TextContent => {
  if (block._meta) return false;
  return block.type === 'text' && hasUnannotatedTextTail(row);
};
const createMessageUpdate = (
  stream: MessageStream,
  message: MessageBlock,
): FeedUpdate => ({
  id: stream.id,
  messageId: stream.upstreamId ?? stream.id,
  sessionUpdate: message.kind,
  state: 'open',
  content: [message.block],
});
const createContentPatch = (
  row: MessageRow,
  message: MessageBlock,
): FeedChange => ({
  type: 'patch',
  id: row.id,
  set: {
    content: [...row.content, message.block],
  },
});
const appendMessageContent = (
  row: MessageRow,
  message: MessageBlock,
): FeedChange => {
  if (canAppendTextContent(row, message.block))
    return {
      type: 'append',
      id: row.id,
      field: `content.${row.content.length - 1}.text`,
      text: message.block.text,
    };
  return createContentPatch(row, message);
};
const createMessageChunkChange = (
  input: MessageInput,
  stream: MessageStream,
  message: MessageBlock,
): FeedChange => {
  const previous = input.findRow(stream.id);
  if (previous?.sessionUpdate === message.kind)
    return appendMessageContent(previous, message);
  return { type: 'upsert', update: createMessageUpdate(stream, message) };
};
const createMessageBlock = (input: MessageInput): MessageBlock => ({
  kind:
    input.update.sessionUpdate === 'agent_message_chunk'
      ? 'agent_message'
      : 'agent_thought',
  block: mapSupportedContentBlock(input.update.content),
});
const assembleMessageChunk = (input: MessageInput): AssembledContent => {
  const message = createMessageBlock(input);
  const stream = selectMessageStream(
    input,
    message.kind,
    input.update.messageId ?? null,
  );
  return {
    change: createMessageChunkChange(input, stream, message),
    streams: { ...input.streams, [message.kind]: stream },
    diagnostics: collectUnsupportedContentReasons([message.block]),
  };
};
export const assembleAcpMessage = (
  input: ContentAssemblyInput,
): ContentAssemblyResult => {
  if (!isMessageChunk(input.update)) return undefined;
  return assembleMessageChunk({ ...input, update: input.update });
};

import type { AgentMapping } from '../src/agent-adapter';
import { dropped, upsert } from './feed-rows';
import { textOf, textRow } from './feed-rows';
import type { MappingState } from './mapping-state';
import type { VendorMessage } from './messages';
import { toolCallStarted } from './tool-calls';
type Assistant = Extract<VendorMessage, { type: 'assistant' }>;
type Block = Assistant['message']['content'][number];
type BlockInput = {
  block: Block;
  rowId: string;
  messageId: string;
  mappingState: MappingState;
  timestamp: number | undefined;
};
export function mapAssistant(
  message: Assistant,
  mappingState: MappingState,
): AgentMapping<MappingState> {
  return message.message.content.reduce(
    (mapped, block): AgentMapping<MappingState> => {
      const next = mapNextBlock(message, block, mapped.mappingState);
      return {
        events: [...mapped.events, ...next.events],
        mappingState: next.mappingState,
      };
    },
    dropped(mappingState),
  );
}
function mapNextBlock(
  message: Assistant,
  block: Block,
  state: MappingState,
): AgentMapping<MappingState> {
  const messageId = message.message.id;
  const index = state.blockCounts[messageId] ?? 0;
  return mapBlock({
    ...nextBlockIdentity(messageId, index, state),
    block,
    timestamp: receiptTime(message),
  });
}
function nextBlockIdentity(
  messageId: string,
  index: number,
  state: MappingState,
): Omit<BlockInput, 'block' | 'timestamp'> {
  return {
    rowId: `${messageId}#${index}`,
    messageId,
    mappingState: {
      ...state,
      blockCounts: { ...state.blockCounts, [messageId]: index + 1 },
    },
  };
}
function receiptTime(message: Assistant): number | undefined {
  return message.timestamp === undefined
    ? message.receivedAt
    : Date.parse(message.timestamp);
}
function mapBlock(input: BlockInput): AgentMapping<MappingState> {
  if (input.block.type === 'tool_use') return mapTool(input, input.block);
  if (isTextBlock(input.block)) return mapText(input, input.block);
  return dropped(input.mappingState);
}
function mapText(
  input: BlockInput,
  block: Extract<Block, { type: 'text' | 'thinking' }>,
): AgentMapping<MappingState> {
  const { kind, text } = textOf(block);
  const openTextRows = { ...input.mappingState.openTextRows };
  delete openTextRows[input.rowId];
  return {
    events: [upsert(settledText(input, kind, text))],
    mappingState: { ...input.mappingState, openTextRows },
  };
}
function mapTool(
  input: BlockInput,
  block: Extract<Block, { type: 'tool_use' }>,
): AgentMapping<MappingState> {
  const row = toolCallStarted(block, input.timestamp);
  return {
    events: [upsert(row)],
    mappingState: {
      ...input.mappingState,
      openToolCalls: { ...input.mappingState.openToolCalls, [block.id]: row },
    },
  };
}

function isTextBlock(
  block: Block,
): block is Extract<Block, { type: 'text' | 'thinking' }> {
  return block.type === 'text' || block.type === 'thinking';
}

function settledText(
  input: BlockInput,
  kind: ReturnType<typeof textOf>['kind'],
  text: string,
): ReturnType<typeof textRow> {
  return textRow({
    id: input.rowId,
    messageId: input.messageId,
    kind,
    text,
    state: 'settled',
  });
}

import type { FeedUpdate, ToolCallContent } from '@repo/contracts';
import {
  matchingTerminal,
  terminalIdOf,
  type TerminalMetadata,
} from './tool-terminal-metadata';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

type TextBlock = Extract<ToolCallContent, { type: 'content' }>;

const textOutput = (terminalId: string, text: string): TextBlock => ({
  type: 'content',
  content: { type: 'text', text },
  _meta: { acp: { terminalId } },
});

const continuesOutput = (
  block: ToolCallContent,
  terminalId: string,
): block is TextBlock => {
  if (block.type !== 'content') return false;

  return terminalIdOf(block) === terminalId;
};

const appendText = (block: TextBlock, text: string): TextBlock => {
  if (block.content.type !== 'text') return block;

  return {
    ...block,
    content: { ...block.content, text: block.content.text + text },
  };
};

const appendOutput = (
  content: ToolCallContent[],
  delta: NonNullable<TerminalMetadata['delta']>,
): ToolCallContent[] => {
  const index = content.findIndex((block) =>
    continuesOutput(block, delta.terminal_id),
  );

  if (index === -1)
    return [...content, textOutput(delta.terminal_id, delta.data)];

  return content.map((block, at) =>
    at === index ? appendTextBlock(block, delta.data) : block,
  );
};

const appendTextBlock = (
  block: ToolCallContent,
  data: string,
): ToolCallContent =>
  block.type === 'content' ? appendText(block, data) : block;

const hasTerminal = (content: ToolCallContent[]): boolean =>
  content.some(
    (block) => block.type === 'terminal' || block.type === 'unsupported',
  );

// Codex also sends read/search/list output on this channel, without a terminal reference.
export const appendCommandOutput = (
  row: ToolRow,
  metadata: TerminalMetadata,
): ToolCallContent[] => {
  if (hasTerminal(row.content)) return row.content;

  const delta = matchingTerminal(metadata.delta, row.toolCallId);

  return delta ? appendOutput(row.content, delta) : row.content;
};

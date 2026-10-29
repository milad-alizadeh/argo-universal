import type {
  FeedUpdate,
  ToolCallContent,
  ToolCallTerminal,
} from '@repo/contracts';
import { z } from 'zod';
import { appendCommandOutput } from './tool-command-output';
import {
  matchingTerminal,
  readTerminalMetadata,
  terminalExitStatus,
  terminalIdOf,
  type TerminalMetadata,
  type ToolUpdate,
} from './tool-terminal-metadata';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

type TerminalBlock = Extract<
  NonNullable<ToolUpdate['content']>[number],
  { type: 'terminal' }
>;

const readCommand = (row: ToolRow): string => {
  const parsed = z.object({ command: z.string() }).safeParse(row.rawInput);

  return parsed.success ? parsed.data.command : row.title;
};

const createTerminal = (
  block: TerminalBlock,
  row: ToolRow,
  cwd: string,
): ToolCallTerminal => ({
  type: 'terminal',
  command: readCommand(row),
  cwd,
  output: '',
  _meta: { acp: { ...block._meta, terminalId: block.terminalId } },
});

// Codex's terminal metadata channel names Agent-owned terminals, not Client resources.
export const mapToolTerminal = (
  block: TerminalBlock,
  row: ToolRow,
): ToolCallTerminal | undefined => {
  const metadata = readTerminalMetadata(row._meta?.acp);
  const info = matchingTerminal(metadata.info, block.terminalId);

  return info ? createTerminal(block, row, info.cwd) : undefined;
};

const updateTerminal = (
  block: ToolCallTerminal,
  metadata: TerminalMetadata,
): ToolCallTerminal => {
  const id = terminalIdOf(block);
  const delta = matchingTerminal(metadata.delta, id);
  const exit = matchingTerminal(metadata.exit, id);
  const next = { ...block };

  if (delta) next.output += delta.data;

  if (exit) next.exitStatus = terminalExitStatus(exit);

  return next;
};

const hasTerminalChange = (
  block: ToolCallTerminal,
  metadata: TerminalMetadata,
): boolean => {
  const id = terminalIdOf(block);

  return (
    matchingTerminal(metadata.delta, id) !== undefined ||
    matchingTerminal(metadata.exit, id) !== undefined
  );
};

const applyTerminalUpdate = (
  block: ToolCallContent,
  metadata: TerminalMetadata,
): ToolCallContent => {
  if (block.type !== 'terminal') return block;

  return hasTerminalChange(block, metadata)
    ? updateTerminal(block, metadata)
    : block;
};

export const applyToolTerminalUpdate = (
  row: ToolRow,
  metadata: TerminalMetadata,
): ToolRow => {
  const content = appendCommandOutput(row, metadata).map((block) =>
    applyTerminalUpdate(block, metadata),
  );

  return content.some((block, index) => block !== row.content[index])
    ? { ...row, content }
    : row;
};

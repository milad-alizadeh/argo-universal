import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedUpdate, SessionUpdate } from '@repo/contracts';
import type { AcpContentInput, AssembledContent } from './assembly';
import { createAcpContentMetadata } from './content';
import { createScopedFeedRowId } from './identity';
import { assignPresentField } from './present-field';
import {
  mapToolCallContent,
  collectUnsupportedToolContentReasons,
} from './tool-content';
import {
  restoreToolContent,
  retainToolContent,
  capAssembledToolOutput,
} from './tool-content-stream';
import { nameToolCall } from './tool-names';
import { applyToolTerminalUpdate, mapToolTerminal } from './tool-terminal';
import {
  readTerminalMetadata,
  retainedTerminalMetadata,
} from './tool-terminal-metadata';

type ToolUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'tool_call' | 'tool_call_update' }
>;

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

type ToolInput = {
  update: ToolUpdate;
  acpSessionId: string;
  findRow: (id: string) => SessionUpdate | undefined;
  toolContents?: AcpContentInput['toolContents'];
};

// The Feed row of an ACP Session's Tool call.
export const acpToolCallRowId = (
  acpSessionId: string,
  toolCallId: string,
): string =>
  createScopedFeedRowId({
    acpSessionId,
    kind: 'tool_call_update',
    upstreamId: toolCallId,
  });

const createInitialToolRow = (id: string, toolCallId: string): ToolRow => ({
  id,
  toolCallId,
  sessionUpdate: 'tool_call_update',
  state: 'open',
  title: 'Tool call',
  kind: 'other',
  status: 'pending',
  content: [],
});

const assignSuppliedToolFields = (row: ToolRow, update: ToolUpdate): void => {
  assignPresentField(row, 'title', update.title);
  assignPresentField(row, 'kind', update.kind);
  assignPresentField(row, 'status', update.status);
  assignPresentField(row, 'name', update.name);
  assignPresentField(row, 'rawInput', update.rawInput);
  assignPresentField(row, 'rawOutput', update.rawOutput);
};

const replaceToolLocations = (
  existing: ToolRow,
  update: ToolUpdate,
): ToolRow['locations'] =>
  update.locations?.map((location) => ({
    path: location.path,
    line: location.line ?? undefined,
  })) ?? existing.locations;

const replaceToolMetadata = (
  existing: ToolRow,
  update: ToolUpdate,
): ToolRow['_meta'] => ({
  ...existing._meta,
  ...createAcpContentMetadata(
    retainedTerminalMetadata(update._meta) ?? existing._meta?.acp,
  ),
});

const replaceToolContent = (
  row: ToolRow,
  update: ToolUpdate,
): ToolRow['content'] =>
  update.content?.map((block) => mapToolContent(block, row)) ?? row.content;

const mapToolContent = (
  block: NonNullable<ToolUpdate['content']>[number],
  row: ToolRow,
): ToolRow['content'][number] => {
  if (block.type !== 'terminal') return mapToolCallContent(block);

  return mapToolTerminal(block, row) ?? mapToolCallContent(block);
};

const mergeToolCallUpdate = (
  existing: ToolRow,
  update: ToolUpdate,
): ToolRow => {
  const row: ToolRow = {
    ...existing,
    locations: replaceToolLocations(existing, update),
    content: existing.content,
    _meta: replaceToolMetadata(existing, update),
  };

  assignSuppliedToolFields(row, update);

  row.content = replaceToolContent(row, update);

  return applyToolTerminalUpdate(row, readTerminalMetadata(update._meta));
};

const setToolRowState = (tool: ToolRow): ToolRow => ({
  ...tool,
  state:
    tool.status === 'completed' || tool.status === 'failed'
      ? 'settled'
      : 'open',
});

const readOrCreateToolRow = (toolInput: ToolInput): ToolRow => {
  const id = acpToolCallRowId(
    toolInput.acpSessionId,
    toolInput.update.toolCallId,
  );

  const previous = toolInput.findRow(id);

  if (previous?.sessionUpdate !== 'tool_call_update')
    return createInitialToolRow(id, toolInput.update.toolCallId);

  return restoreToolContent(previous, toolInput.toolContents);
};

const assembleToolRow = (existing: ToolRow, update: ToolUpdate): ToolRow =>
  setToolRowState(nameToolCall(mergeToolCallUpdate(existing, update)));

const unsupportedToolReasons = (update: ToolUpdate, row: ToolRow): string[] =>
  update.content ? collectUnsupportedToolContentReasons(row.content) : [];

export const assembleToolCall = (input: ToolInput): AssembledContent => {
  const previous = readOrCreateToolRow(input);
  const assembled = assembleToolRow(previous, input.update);

  const { row: update, blobs } = capAssembledToolOutput(
    input,
    previous,
    assembled,
  );

  return {
    change: { type: 'upsert', update },
    blobs,
    toolContents: retainToolContent(input.toolContents, assembled, update),
    diagnostics: unsupportedToolReasons(input.update, update),
  };
};

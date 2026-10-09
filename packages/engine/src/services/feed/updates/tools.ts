import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedUpdate, SessionUpdate } from '@repo/contracts';
import type { AssembledContent } from './assembly';
import { createAcpContentMetadata } from './content';
import { createScopedFeedRowId } from './identity';
import {
  mapToolCallContent,
  collectUnsupportedToolContentReasons,
} from './tool-content';

type ToolUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'tool_call' | 'tool_call_update' }
>;
type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;
type ToolInput = {
  update: ToolUpdate;
  acpSessionId: string;
  findRow: (id: string) => SessionUpdate | undefined;
};
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
const readSuppliedToolFields = (update: ToolUpdate): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({
      title: update.title,
      kind: update.kind,
      status: update.status,
      name: update.name,
      rawInput: update.rawInput,
      rawOutput: update.rawOutput,
    }).filter(([, value]) => value != null),
  );
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
  ...createAcpContentMetadata(update._meta ?? existing._meta?.acp),
});
const mergeToolCallUpdate = (
  existing: ToolRow,
  update: ToolUpdate,
): ToolRow => ({
  ...existing,
  ...readSuppliedToolFields(update),
  locations: replaceToolLocations(existing, update),
  content: update.content?.map(mapToolCallContent) ?? existing.content,
  _meta: replaceToolMetadata(existing, update),
});
const setToolRowState = (tool: ToolRow): ToolRow => ({
  ...tool,
  state:
    tool.status === 'completed' || tool.status === 'failed'
      ? 'settled'
      : 'open',
});
const readExistingTool = (input: ToolInput): ToolRow => {
  const id = createScopedFeedRowId({
    acpSessionId: input.acpSessionId,
    kind: 'tool_call_update',
    upstreamId: input.update.toolCallId,
  });
  const previous = input.findRow(id);
  return previous?.sessionUpdate === 'tool_call_update'
    ? previous
    : createInitialToolRow(id, input.update.toolCallId);
};
export const assembleToolCall = (input: ToolInput): AssembledContent => {
  const update = setToolRowState(
    mergeToolCallUpdate(readExistingTool(input), input.update),
  );
  return {
    change: { type: 'upsert', update },
    diagnostics: input.update.content
      ? collectUnsupportedToolContentReasons(update.content)
      : [],
  };
};

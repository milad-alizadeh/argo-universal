import type { ToolCallStatus } from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';
import { destinationPath, patchOf } from './file-patch';
import type { ThreadItem } from './protocol.gen';
import { actionOf, changeOf, webSearchOf } from './tool-input';

export type ToolCallRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;
type ToolItem = Extract<
  ThreadItem,
  { type: 'commandExecution' | 'fileChange' | 'mcpToolCall' | 'webSearch' }
>;
type StatusItem = Exclude<ToolItem, { type: 'webSearch' }>;
export const isToolItem = (item: ThreadItem): item is ToolItem =>
  item.type === 'commandExecution' ||
  item.type === 'fileChange' ||
  item.type === 'mcpToolCall' ||
  item.type === 'webSearch';

const statusOf = (status: StatusItem['status']): ToolCallStatus => {
  switch (status) {
    case 'inProgress':
      return 'in_progress';
    case 'declined':
      return 'cancelled';
    default:
      return status;
  }
};

const commonRow = (
  item: ToolItem,
  state: 'open' | 'settled',
): Pick<
  ToolCallRow,
  'id' | 'toolCallId' | 'sessionUpdate' | 'state' | 'status'
> => {
  return {
    id: item.id,
    toolCallId: item.id,
    sessionUpdate: 'tool_call_update' as const,
    state,
    status: 'status' in item ? statusOf(item.status) : searchStatus(state),
  };
};
// A web search item carries no status: it runs until Codex completes it.
const searchStatus = (state: 'open' | 'settled'): ToolCallStatus =>
  state === 'open' ? 'in_progress' : 'completed';

type CommandItem = Extract<ToolItem, { type: 'commandExecution' }>;
type EditItem = Extract<ToolItem, { type: 'fileChange' }>;
const commandMetadata = (item: CommandItem): Pick<ToolCallRow, '_meta'> =>
  item.commandActions.length
    ? { _meta: { argo: { commandActions: item.commandActions.map(actionOf) } } }
    : {};
// The command the Agent's one action names, which leaves out the shell wrapper.
const shownCommand = (item: CommandItem): string =>
  item.commandActions.length === 1
    ? (item.commandActions[0]?.command ?? item.command)
    : item.command;
const commandTerminal = (
  item: CommandItem,
): NonNullable<ToolCallRow['content']>[number] => ({
  type: 'terminal',
  command: shownCommand(item),
  cwd: item.cwd,
  output: item.aggregatedOutput ?? '',
  ...(item.exitCode === null
    ? {}
    : { exitStatus: { exitCode: item.exitCode } }),
});
const commandInput = (item: CommandItem): ToolCallRow['rawInput'] => ({
  command: item.command,
  cwd: item.cwd,
  commandActions: item.commandActions,
});
const commandRow = (
  item: CommandItem,
  state: 'open' | 'settled',
): ToolCallRow => ({
  ...commonRow(item, state),
  title: shownCommand(item),
  name: item.type,
  kind: 'execute',
  rawInput: commandInput(item),
  rawOutput: { durationMs: item.durationMs, exitCode: item.exitCode },
  ...commandMetadata(item),
  content: [commandTerminal(item)],
});
const editContent = (
  item: EditItem,
): NonNullable<ToolCallRow['content']>[number] => ({
  type: 'diff',
  changes: item.changes.map(changeOf),
  patch: { format: 'git_patch', text: item.changes.map(patchOf).join('') },
});
const editRow = (item: EditItem, state: 'open' | 'settled'): ToolCallRow => ({
  ...commonRow(item, state),
  title: `Edit ${item.changes.map((change): string => change.path).join(', ')}`,
  name: item.type,
  kind: 'edit',
  locations: item.changes.map((change): { path: string } => ({
    path: destinationPath(change),
  })),
  content: [editContent(item)],
});
type McpItem = Extract<ToolItem, { type: 'mcpToolCall' }>;
const mcpRow = (item: McpItem, state: 'open' | 'settled'): ToolCallRow => ({
  ...commonRow(item, state),
  title: `${item.server}: ${item.tool}`,
  name: item.tool,
  kind: 'other',
  rawInput: item.arguments,
  content: [],
});
type SearchItem = Extract<ToolItem, { type: 'webSearch' }>;
const searchRow = (
  item: SearchItem,
  state: 'open' | 'settled',
): ToolCallRow => {
  const { title, webAction } = webSearchOf(item);
  return {
    ...commonRow(item, state),
    title,
    name: item.type,
    kind: 'fetch',
    _meta: { argo: { webAction } },
    content: [],
  };
};
export function toToolCall(
  item: ToolItem,
  state: 'open' | 'settled',
): ToolCallRow {
  switch (item.type) {
    case 'commandExecution':
      return commandRow(item, state);
    case 'fileChange':
      return editRow(item, state);
    case 'mcpToolCall':
      return mcpRow(item, state);
    case 'webSearch':
      return searchRow(item, state);
  }
}

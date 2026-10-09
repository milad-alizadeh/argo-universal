import type { ToolCallStatus } from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';
import { destinationPath, patchOf } from './file-patch';
import type { ThreadItem } from './protocol.gen';
import { actionOf, changeOf } from './tool-input';

export type ToolCallRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;
type ToolItem = Extract<
  ThreadItem,
  { type: 'commandExecution' | 'fileChange' }
>;

const statusOf = (status: ToolItem['status']): ToolCallStatus => {
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
    status: statusOf(item.status),
  };
};

type CommandItem = Extract<ToolItem, { type: 'commandExecution' }>;
type EditItem = Extract<ToolItem, { type: 'fileChange' }>;
const commandMetadata = (item: CommandItem): Pick<ToolCallRow, '_meta'> =>
  item.commandActions.length
    ? { _meta: { argo: { commandActions: item.commandActions.map(actionOf) } } }
    : {};
const commandTerminal = (
  item: CommandItem,
): NonNullable<ToolCallRow['content']>[number] => ({
  type: 'terminal',
  command: item.command,
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
  title: item.command,
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
export function toToolCall(
  item: ToolItem,
  state: 'open' | 'settled',
): ToolCallRow {
  return item.type === 'commandExecution'
    ? commandRow(item, state)
    : editRow(item, state);
}

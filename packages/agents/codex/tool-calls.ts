import type { DiffChange, ToolCallStatus } from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';
import type { FileUpdateChange, ThreadItem } from './protocol.gen';

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
const changeOf = ({ path, kind, diff }: FileUpdateChange): DiffChange => {
  switch (kind.type) {
    case 'add':
      return { operation: 'add', path, newText: diff };
    case 'delete':
      return { operation: 'delete', path, oldText: diff };
    case 'update':
      return kind.move_path
        ? { operation: 'move', path: kind.move_path, oldPath: path }
        : { operation: 'modify', path };
  }
};
const destinationPath = (change: FileUpdateChange) =>
  (change.kind.type === 'update' && change.kind.move_path) || change.path;
const patchOf = (change: FileUpdateChange) => {
  const oldPath = change.path.replace(/^\//, '');
  const newPath = destinationPath(change).replace(/^\//, '');
  const header = `diff --git a/${oldPath} b/${newPath}\n--- ${change.kind.type === 'add' ? '/dev/null' : `a/${oldPath}`}\n+++ ${change.kind.type === 'delete' ? '/dev/null' : `b/${newPath}`}\n`;
  if (change.kind.type === 'update') return header + change.diff;
  const lines = change.diff.replace(/\n$/, '').split('\n');
  const adding = change.kind.type === 'add';
  return `${header}@@ -${adding ? '0,0' : `1,${lines.length}`} +${adding ? `1,${lines.length}` : '0,0'} @@\n${lines.map((line) => (adding ? '+' : '-') + line).join('\n')}\n`;
};

export function toToolCall(
  item: ToolItem,
  state: 'open' | 'settled',
): ToolCallRow {
  const common = {
    id: item.id,
    toolCallId: item.id,
    sessionUpdate: 'tool_call_update' as const,
    state,
    status: statusOf(item.status),
  };
  if (item.type === 'commandExecution')
    return {
      ...common,
      title: item.command,
      name: item.type,
      kind: 'execute',
      rawInput: {
        command: item.command,
        cwd: item.cwd,
        commandActions: item.commandActions,
      },
      rawOutput: { durationMs: item.durationMs, exitCode: item.exitCode },
      content: [
        {
          type: 'terminal',
          command: item.command,
          cwd: item.cwd,
          output: item.aggregatedOutput ?? '',
          ...(item.exitCode === null
            ? {}
            : { exitStatus: { exitCode: item.exitCode } }),
        },
      ],
    };
  return {
    ...common,
    title: `Edit ${item.changes.map((change) => change.path).join(', ')}`,
    name: item.type,
    kind: 'edit',
    locations: item.changes.map((change) => ({
      path: destinationPath(change),
    })),
    content: [
      {
        type: 'diff',
        changes: item.changes.map(changeOf),
        patch: {
          format: 'git_patch',
          text: item.changes.map(patchOf).join(''),
        },
      },
    ],
  };
}

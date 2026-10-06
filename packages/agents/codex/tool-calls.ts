import type {
  CommandAction,
  DiffChange,
  ToolCallStatus,
} from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';
import type {
  FileUpdateChange,
  ThreadItem,
  CommandAction as VendorCommandAction,
} from './protocol.gen';

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
const actionOf = (action: VendorCommandAction): CommandAction => ({
  type: action.type === 'listFiles' ? 'list' : action.type,
  command: action.command,
  ...('path' in action && action.path !== null ? { path: action.path } : {}),
  ...('query' in action && action.query !== null
    ? { query: action.query }
    : {}),
});
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
const quotePath = (filePath: string) => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Git pathnames encode control characters with octal escapes.
  const escaped = filePath.replace(/[\x00-\x20"\\\x7f]/g, (character) => {
    if (character === '"' || character === '\\') return `\\${character}`;
    return `\\${character.charCodeAt(0).toString(8).padStart(3, '0')}`;
  });
  if (escaped === filePath) return filePath;
  return `"${escaped}"`;
};
const patchOf = (change: FileUpdateChange) => {
  const oldPath = change.path.replace(/^\//, '');
  const newPath = destinationPath(change).replace(/^\//, '');
  const oldFile = quotePath(`a/${oldPath}`);
  const newFile = quotePath(`b/${newPath}`);
  const header = `diff --git ${oldFile} ${newFile}\n`;
  if (change.kind.type === 'update') {
    const rename =
      oldPath === newPath
        ? ''
        : `rename from ${quotePath(oldPath)}\nrename to ${quotePath(newPath)}\n`;
    if (!change.diff) return rename ? header + rename : '';
    return `${header}${rename}--- ${oldFile}\n+++ ${newFile}\n${change.diff}`;
  }
  const adding = change.kind.type === 'add';
  const mode = adding ? 'new' : 'deleted';
  const metadata = `${mode} file mode 100644\n`;
  if (!change.diff) return header + metadata;
  const lines = change.diff.split('\n');
  const finalNewline = lines.at(-1) === '';
  if (finalNewline) lines.pop();
  const oldMarker = adding ? '/dev/null' : oldFile;
  const newMarker = adding ? newFile : '/dev/null';
  const range = `1,${lines.length}`;
  const oldRange = adding ? '0,0' : range;
  const newRange = adding ? range : '0,0';
  const sign = adding ? '+' : '-';
  const body = lines.map((line) => sign + line).join('\n');
  let patch = `${header}${metadata}--- ${oldMarker}\n+++ ${newMarker}\n@@ -${oldRange} +${newRange} @@\n${body}\n`;
  if (!finalNewline) patch += '\\ No newline at end of file\n';
  return patch;
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
      ...(item.commandActions.length
        ? {
            _meta: {
              argo: { commandActions: item.commandActions.map(actionOf) },
            },
          }
        : {}),
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

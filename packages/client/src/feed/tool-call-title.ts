import {
  isToolCallRunning,
  knownCommandActions,
  type ToolCallUpdate,
} from '@repo/contracts';

// The paths a title names, which the Feed draws in mono.
export function toolCallTitlePaths(
  row: ToolCallUpdate,
  awaitingApproval = false,
): string[] {
  if (awaitingApproval) return [];
  const actions = knownCommandActions(row);
  if (actions.length)
    return actions.flatMap((action) =>
      (action.type === 'read' ||
        action.type === 'search' ||
        action.type === 'list') &&
      action.path
        ? [action.path]
        : [],
    );
  const path = row.locations?.[0]?.path;
  return row.kind === 'read' && path ? [path] : [];
}

export function toolCallTitle(
  row: ToolCallUpdate,
  awaitingApproval = false,
): string {
  if (awaitingApproval) return row.title;
  const actions = knownCommandActions(row);
  if (actions.length) {
    return actions
      .map((action) => {
        switch (action.type) {
          case 'read':
            return action.path ? `Read ${action.path}` : 'Read file';
          case 'search':
            return `Search${action.query ? ` for ${action.query}` : ''}${action.path ? ` in ${action.path}` : ''}`;
          case 'list':
            return action.path ? `List ${action.path}` : 'List files';
          default:
            return row.title;
        }
      })
      .join(', ');
  }
  const path = row.locations?.[0]?.path;
  if (row.kind === 'read' && path) return `Read ${path}`;
  const terminal = row.content.find((content) => content.type === 'terminal');
  if (row.title && row.title !== terminal?.command) return row.title;
  if (isToolCallRunning(row)) return 'Running command';
  return row.status === 'cancelled' ? 'Stopped command' : 'Ran command';
}

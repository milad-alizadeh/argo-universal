import type { ToolCallUpdate } from '@repo/contracts';

export function toolCallTitle(
  row: ToolCallUpdate,
  awaitingApproval = false,
): string {
  if (awaitingApproval) return row.title;
  const actions = row._meta?.argo?.commandActions;
  if (actions?.length && actions.every((action) => action.type !== 'unknown')) {
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
  switch (row.status) {
    case 'pending':
    case 'in_progress':
      return 'Running command';
    case 'cancelled':
      return 'Stopped command';
    default:
      return 'Ran command';
  }
}

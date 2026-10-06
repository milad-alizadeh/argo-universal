import type {
  PendingElicitation,
  PendingPermission,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';

export interface LiveHeaderInput {
  activeTurnId: string | null;
  permissionQueue: readonly PendingPermission[];
  pendingElicitation: PendingElicitation | null;
  pendingPlanProposal?: { planId: string; content: string } | null;
}

function toolKindLabel(tool: ToolCallUpdate): string | null {
  const path =
    tool.locations?.[0]?.path ??
    tool.content.flatMap((block) =>
      block.type === 'diff' ? block.changes.map((change) => change.path) : [],
    )[0];
  switch (tool.kind) {
    case 'execute': {
      const actions = tool._meta?.argo?.commandActions;
      const action =
        actions?.length && actions.every((action) => action.type !== 'unknown')
          ? actions[0]
          : undefined;
      if (action?.type === 'read')
        return action.path ? `Reading ${action.path}` : 'Reading files';
      if (action?.type === 'search')
        return action.query
          ? `Searching for ${action.query}`
          : 'Searching files';
      if (action?.type === 'list')
        return action.path ? `Listing ${action.path}` : 'Listing files';
      const terminal = tool.content.find((block) => block.type === 'terminal');
      return terminal?.command
        ? `Running ${terminal.command}`
        : 'Running command';
    }
    case 'read':
      return path ? `Reading ${path}` : 'Reading files';
    case 'edit':
      return path ? `Editing ${path}` : 'Editing files';
    case 'delete':
      return path ? `Deleting ${path}` : 'Deleting files';
    case 'move':
      return path ? `Moving ${path}` : 'Moving files';
    case 'search':
      return 'Searching files';
    case 'fetch':
      return 'Searching the web';
    case 'think':
      return 'Thinking';
    case 'switch_mode':
      return 'Switching mode';
    case 'other':
      return null;
  }
}

export function toLiveHeader(
  session: LiveHeaderInput,
  rows: readonly SessionUpdate[],
): string | null {
  if (session.permissionQueue.length) return 'Awaiting approval';
  if (session.pendingElicitation) return 'Waiting for your answer';
  if (session.pendingPlanProposal) return 'Plan ready';
  if (session.activeTurnId === null) return null;
  const current = rows
    .filter((row) => row.turnId === session.activeTurnId)
    .toSorted((first, second) => first.revision - second.revision);
  const latest = current.at(-1);
  const retry =
    latest?.sessionUpdate === 'notice' ? latest._meta?.argo?.retry : undefined;
  if (retry) return `Retrying (${retry.attempt} of ${retry.maxAttempts})`;
  const thought = current
    .filter((row) => row.sessionUpdate === 'agent_thought')
    .toSorted((first, second) => first.position - second.position)
    .at(-1);
  const thoughtText =
    thought?.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n') ?? '';
  const title = [...thoughtText.matchAll(/^\s*\*\*([^\n]+?)\*\*\s*$/gm)]
    .at(-1)?.[1]
    ?.trim();
  if (title) return title;
  const tool = current
    .filter(
      (row): row is ToolCallUpdate =>
        row.sessionUpdate === 'tool_call_update' &&
        (row.status === 'in_progress' || row.status === 'pending'),
    )
    .toSorted((first, second) => first.position - second.position)
    .at(-1);
  const description = tool?._meta?.argo?.description;
  if (description?.trim()) return description;
  if (tool) return toolKindLabel(tool) ?? (tool.name?.trim() || 'Working');
  return 'Working';
}

import type { ToolCallTerminal } from '@repo/contracts';
import {
  isToolCallRunning,
  knownCommandActions,
  type TextContent,
  type LiveHeader,
  type LiveHeaderSource,
  type PendingElicitation,
  type PendingPermission,
  type SessionUpdate,
  type ToolCallUpdate,
} from '@repo/contracts';

export interface LiveHeaderInput {
  activeTurnId: string | null;
  activeTurnStartedAt: number | null;
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
  pendingPlanProposal?: { planId: string; content: string } | null;
}

function toolKindLabel(tool: ToolCallUpdate): string | null {
  const path =
    tool.locations?.[0]?.path ??
    tool.content.flatMap((block): string[] =>
      block.type === 'diff'
        ? block.changes.map((change): string => change.path)
        : [],
    )[0];
  switch (tool.kind) {
    case 'execute': {
      const action = knownCommandActions(tool)[0];
      if (action?.type === 'read')
        return action.path ? `Reading ${action.path}` : 'Reading files';
      if (action?.type === 'search')
        return action.query
          ? `Searching for ${action.query}`
          : 'Searching files';
      if (action?.type === 'list')
        return action.path ? `Listing ${action.path}` : 'Listing files';
      const terminal = tool.content.find(
        (block): block is ToolCallTerminal => block.type === 'terminal',
      );
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
): LiveHeader | null {
  const header = (text: string, source: LiveHeaderSource): LiveHeader => ({
    text,
    source,
    startedAt: session.activeTurnStartedAt,
  });
  const request = { type: 'request' } as const;
  if (session.permissionQueue.length)
    return header('Awaiting approval', request);
  if (session.elicitationQueue.length)
    return header('Waiting for your answer', request);
  if (session.pendingPlanProposal) return header('Plan ready', request);
  if (session.activeTurnId === null) return null;
  const current = rows
    .filter((row): boolean => row.turnId === session.activeTurnId)
    .toSorted((first, second): number => first.revision - second.revision);
  const latest = current.at(-1);
  const retry =
    latest?.sessionUpdate === 'notice' ? latest._meta?.argo?.retry : undefined;
  if (retry)
    return header(`Retrying (${retry.attempt} of ${retry.maxAttempts})`, {
      type: 'retry',
    });
  const thought = current
    .filter(
      (
        row,
      ): row is Extract<SessionUpdate, { sessionUpdate: 'agent_thought' }> =>
        row.sessionUpdate === 'agent_thought',
    )
    .toSorted((first, second): number => first.position - second.position)
    .at(-1);
  const thoughtText =
    thought?.content
      .filter((block): block is TextContent => block.type === 'text')
      .map((block): string => block.text)
      .join('\n') ?? '';
  const title = [...thoughtText.matchAll(/^\s*\*\*([^\n]+?)\*\*\s*$/gm)]
    .at(-1)?.[1]
    ?.trim();
  if (title) return header(title, { type: 'thought' });
  const tool = current
    .filter(
      (
        row,
      ): row is Extract<SessionUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update' && isToolCallRunning(row),
    )
    .toSorted((first, second): number => first.position - second.position)
    .at(-1);
  if (!tool) return header('Working', { type: 'working' });
  const text =
    tool._meta?.argo?.description?.trim() ||
    toolKindLabel(tool) ||
    tool.name?.trim();
  return text
    ? header(text, { type: 'tool_call', toolCallId: tool.toolCallId })
    : header('Working', { type: 'working' });
}

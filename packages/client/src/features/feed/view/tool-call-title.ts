import {
  type CommandAction,
  isToolCallRunning,
  type ToolCallUpdate,
} from '@repo/contracts';
import { toolCallFacts } from './feed-row-facts';

function actionPaths(action: CommandAction): string[] {
  if (!['read', 'search', 'list'].includes(action.type)) return [];

  return action.path ? [action.path] : [];
}

function readPath(row: ToolCallUpdate): string | undefined {
  if (row.kind !== 'read') return undefined;

  return toolCallFacts(row).location;
}

export function toolCallTitlePaths(
  row: ToolCallUpdate,
  awaitingApproval = false,
): string[] {
  if (awaitingApproval) return [];

  return pathsFor(row);
}

function pathsFor(row: ToolCallUpdate): string[] {
  const { actions } = toolCallFacts(row);

  return actions.length ? actions.flatMap(actionPaths) : impliedReadPaths(row);
}

function impliedReadPaths(row: ToolCallUpdate): string[] {
  const path = readPath(row);

  return path ? [path] : [];
}

const actionTitles: Partial<
  Record<CommandAction['type'], (action: CommandAction) => string>
> = {
  read: (action): string => (action.path ? `Read ${action.path}` : 'Read file'),
  search: (action): string =>
    `Search${searchQuery(action)}${searchPath(action)}`,
  list: (action): string =>
    action.path ? `List ${action.path}` : 'List files',
};

function searchQuery(action: CommandAction): string {
  return action.query ? ` for ${action.query}` : '';
}

function searchPath(action: CommandAction): string {
  return action.path ? ` in ${action.path}` : '';
}

function actionTitle(action: CommandAction, fallback: string): string {
  return actionTitles[action.type]?.(action) ?? fallback;
}

// claude-agent-acp titles a command "Terminal"; the Agent's own words are in the description.
function describedTitle(row: ToolCallUpdate): string | undefined {
  return agentDescription(row) || adapterTitle(row);
}

const agentDescription = (row: ToolCallUpdate): string | undefined =>
  row._meta?.argo?.description;

function adapterTitle(row: ToolCallUpdate): string | undefined {
  const terminal = row.content.find((content) => content.type === 'terminal');

  return [terminal?.command, 'Terminal', ''].includes(row.title)
    ? undefined
    : row.title;
}

function commandTitle(row: ToolCallUpdate): string {
  const described = describedTitle(row);

  if (described) return described;

  if (isToolCallRunning(row)) return 'Running command';

  return settledCommandTitle(row);
}

function settledCommandTitle(row: ToolCallUpdate): string {
  return row.status === 'cancelled' ? 'Stopped command' : 'Ran command';
}

function impliedToolTitle(row: ToolCallUpdate): string {
  const path = readPath(row);

  return path ? `Read ${path}` : commandTitle(row);
}

export function toolCallTitle(
  row: ToolCallUpdate,
  awaitingApproval = false,
): string {
  if (awaitingApproval) return row.title;

  return titleFor(row);
}

function titleFor(row: ToolCallUpdate): string {
  const { actions } = toolCallFacts(row);

  return actions.length
    ? actions.map((action) => actionTitle(action, row.title)).join(', ')
    : impliedToolTitle(row);
}

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

function commandTitle(row: ToolCallUpdate): string {
  const { agentTitle } = toolCallFacts(row);

  if (agentTitle) return agentTitle;

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

const approvalTitle = (row: ToolCallUpdate): string =>
  toolCallFacts(row).agentTitle ?? row.title;

export function toolCallTitle(
  row: ToolCallUpdate,
  awaitingApproval = false,
): string {
  return awaitingApproval ? approvalTitle(row) : titleFor(row);
}

function titleFor(row: ToolCallUpdate): string {
  const { actions } = toolCallFacts(row);

  return actions.length
    ? actions.map((action) => actionTitle(action, row.title)).join(', ')
    : impliedToolTitle(row);
}

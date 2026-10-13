import {
  type CommandAction,
  isToolCallRunning,
  knownCommandActions,
  type SessionUpdate,
  type ToolCallUpdate,
} from '@repo/contracts';
import type { FeedActivity } from './feed-view';

export function explorationActions(row: ToolCallUpdate): CommandAction[] {
  const actions = knownCommandActions(row);

  if (actions.length) return actions;

  return impliedExploration(row);
}

function impliedExploration(row: ToolCallUpdate): CommandAction[] {
  if (!['read', 'search'].includes(row.kind)) return [];

  return [
    {
      type: row.kind === 'read' ? 'read' : 'search',
      command: '',
      path: firstLocation(row),
    },
  ];
}

export function isEdit(row: ToolCallUpdate): boolean {
  return ['edit', 'delete', 'move'].includes(row.kind);
}

export function editedPaths(row: ToolCallUpdate): Set<string> {
  return new Set([
    ...(row.locations ?? []).map((location) => location.path),
    ...row.content.flatMap((content) =>
      content.type === 'diff'
        ? content.changes.map((change) => change.path)
        : [],
    ),
  ]);
}

function hasSuccessfulMultiFileEdit(row: ToolCallUpdate): boolean {
  return row.status !== 'failed' && editsSeveralFiles(row);
}

function editsSeveralFiles(row: ToolCallUpdate): boolean {
  return isEdit(row) && editedPaths(row).size > 1;
}

export function needsGroupHeader(
  activities: FeedActivity[],
  toolCalls: ToolCallUpdate[],
  liveTitle: string | undefined,
): boolean {
  if (!toolCalls.length) return false;

  return activities.length !== 1 || hasGroupWork(toolCalls, liveTitle);
}

function hasGroupWork(
  toolCalls: ToolCallUpdate[],
  liveTitle: string | undefined,
): boolean {
  return Boolean(liveTitle) || toolCalls.some(hasSuccessfulMultiFileEdit);
}

export function joinsExploration(
  row: ToolCallUpdate,
  awaitingPermission: boolean,
): boolean {
  return isExploration(row) && mayExplore(row, awaitingPermission);
}

function isExploration(row: ToolCallUpdate): boolean {
  return explorationActions(row).length > 0 && row.status !== 'failed';
}

function mayExplore(row: ToolCallUpdate, awaitingPermission: boolean): boolean {
  if (row.status === 'cancelled') return false;

  return !awaitingPermission && !hasPermissionOutcome(row);
}

export function liveTitleFor(
  row: ToolCallUpdate,
  awaitingPermission: boolean,
): string {
  if (awaitingPermission) return 'Awaiting approval';

  return isUnansweredExploration(row) ? 'Exploring' : toolTitle(row);
}

function isUnansweredExploration(row: ToolCallUpdate): boolean {
  return explorationActions(row).length > 0 && !hasPermissionOutcome(row);
}

function toolTitle(row: ToolCallUpdate): string {
  return row.title || row.name || 'Working';
}

export function replacesLiveCall(
  row: ToolCallUpdate,
  approval: { awaitingPermission: boolean; awaitingApproval: boolean },
): boolean {
  return isToolCallRunning(row) && mayReplaceLiveCall(approval);
}

function mayReplaceLiveCall(approval: {
  awaitingPermission: boolean;
  awaitingApproval: boolean;
}): boolean {
  return approval.awaitingPermission || !approval.awaitingApproval;
}

export type GroupRow = Extract<
  SessionUpdate,
  { sessionUpdate: 'agent_thought' | 'notice' | 'tool_call_update' }
>;

export function isGroupRow(row: SessionUpdate): row is GroupRow {
  return (
    ['agent_thought', 'tool_call_update'].includes(row.sessionUpdate) ||
    isGroupedNotice(row)
  );
}

function isGroupedNotice(row: SessionUpdate): boolean {
  return row.sessionUpdate === 'notice' && row.severity !== 'error';
}

export function startsNewTurn(
  row: SessionUpdate,
  previousTurnId: string | null | undefined,
): boolean {
  return previousTurnId !== undefined && row.turnId !== previousTurnId;
}

function firstLocation(row: ToolCallUpdate): string | undefined {
  return row.locations?.[0]?.path;
}

function hasPermissionOutcome(row: ToolCallUpdate): boolean {
  return Boolean(row._meta?.argo?.permissionOutcome);
}

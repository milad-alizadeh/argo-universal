import {
  isToolCallRunning,
  type SessionUpdate,
  type ToolCallUpdate,
} from '@repo/contracts';
import { toolCallFacts } from './feed-row-facts';
import { explorationTitle, type FeedActivity } from './feed-view';

function hasSuccessfulMultiFileEdit(row: ToolCallUpdate): boolean {
  return row.status !== 'failed' && editsSeveralFiles(row);
}

function editsSeveralFiles(row: ToolCallUpdate): boolean {
  return (toolCallFacts(row).editedPaths?.size ?? 0) > 1;
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
  return explores(row) && row.status !== 'failed';
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

  if (isUnansweredExploration(row)) return explorationTitle('open');

  return toolTitle(row);
}

function isUnansweredExploration(row: ToolCallUpdate): boolean {
  return explores(row) && !hasPermissionOutcome(row);
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

// Whether the Agent's actions, reported or implied, explore rather than change anything.
export function explores(row: ToolCallUpdate): boolean {
  return toolCallFacts(row).exploration.length > 0;
}

function hasPermissionOutcome(row: ToolCallUpdate): boolean {
  return Boolean(toolCallFacts(row).permissionOutcome);
}

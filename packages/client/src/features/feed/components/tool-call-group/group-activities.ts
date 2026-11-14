import type { LiveHeader, ToolCallUpdate } from '@repo/contracts';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';
import { groupTitle } from '../../view/group-title';
import { toolCallTitle } from '../../view/tool-call-title';

type LiveToolCall = Extract<FeedGroup, { state: 'open' }>['live'];

type FeedExploration = Extract<FeedActivity, { type: 'exploration' }>;

export const activityKey = (activity: FeedActivity): string =>
  activity.type === 'exploration' ? activity.id : activity.row.id;

const openLive = (group: FeedGroup): LiveToolCall =>
  group.state === 'open' ? group.live : undefined;

function activityCalls(activity: FeedActivity): ToolCallUpdate[] {
  if (activity.type === 'exploration') return activity.toolCalls;

  return activity.type === 'tool_call' ? [activity.row] : [];
}

const groupCalls = (group: FeedGroup): ToolCallUpdate[] =>
  group.items.flatMap(activityCalls);

export const groupSummary = (group: FeedGroup): string =>
  group.state === 'settled' ? group.title : groupTitle(groupCalls(group));

function headerCall(group: FeedGroup): LiveToolCall {
  const header = group.liveHeader;

  return header ? matchingHeaderCall(group, header) : undefined;
}

function matchingHeaderCall(
  group: FeedGroup,
  header: LiveHeader,
): LiveToolCall {
  const live = callForSource(group, header.source);

  if (!live) return undefined;

  const title = toolCallTitle(
    live.toolCall,
    live.awaitingApproval,
    group.state === 'settled',
  );

  return header.text.trim() === title.trim() ? live : undefined;
}

function callForSource(
  group: FeedGroup,
  source: LiveHeader['source'],
): LiveToolCall {
  if (source.type !== 'tool_call') return undefined;

  const toolCall = groupCalls(group).find(
    (row) => row.toolCallId === source.toolCallId,
  );

  return toolCall
    ? { toolCall, awaitingApproval: callAwaitsApproval(group, toolCall) }
    : undefined;
}

function callAwaitsApproval(group: FeedGroup, row: ToolCallUpdate): boolean {
  const live = openLive(group);

  return live?.toolCall.id === row.id && live.awaitingApproval;
}

function mayTitleHeader(
  group: FeedGroup,
  live: NonNullable<LiveToolCall>,
): boolean {
  return leadsGroup(group, live.toolCall.id) && !live.awaitingApproval;
}

export function liveHeaderOf(group: FeedGroup): LiveHeader | undefined {
  const live = headerCall(group);

  if (live && !mayTitleHeader(group, live)) return undefined;

  return group.liveHeader;
}

export const liveToolCall = (group: FeedGroup): LiveToolCall =>
  group.liveHeader ? headerCall(group) : openLive(group);

const awaitsApproval = (group: FeedGroup): boolean =>
  openLive(group)?.awaitingApproval === true;

// The duration shows while the group runs, unless its live Tool call waits for approval or the live header carries the time.
export const showsDuration = (group: FeedGroup): boolean =>
  group.state === 'open' && !liveHeaderOf(group) && !awaitsApproval(group);

function explorationWithout(
  activity: FeedExploration,
  liveId: string,
): FeedActivity[] {
  const remaining = activity.toolCalls.filter((row) => row.id !== liveId);

  return remaining.length ? [{ ...activity, toolCalls: remaining }] : [];
}

const isLiveToolCall = (activity: FeedActivity, liveId: string): boolean =>
  activity.type === 'tool_call' && activity.row.id === liveId;

function genericOutput(
  row: Extract<FeedActivity, { type: 'tool_call' }>['row'],
): boolean {
  return [
    row.content.length > 0,
    row.rawInput != null,
    row.rawOutput != null,
  ].some(Boolean);
}

// Any available detail stays visible under the live title, whatever the Tool call's semantic kind.
function liveDetail(activity: FeedActivity): boolean {
  return activity.type === 'tool_call' && genericOutput(activity.row);
}

function keepActivity(activity: FeedActivity, liveId: string): boolean {
  return !isLiveToolCall(activity, liveId) || liveDetail(activity);
}

function activityWithout(
  activity: FeedActivity,
  liveId: string,
): FeedActivity[] {
  if (activity.type === 'exploration')
    return explorationWithout(activity, liveId);

  return keepActivity(activity, liveId) ? [activity] : [];
}

const drawnActivities = (group: FeedGroup): FeedActivity[] =>
  group.items.filter((activity) => activity.type !== 'thought');

const drawsOnlyLive = (activity: FeedActivity, liveId: string): boolean =>
  activity.type === 'exploration'
    ? activity.toolCalls.every((row) => row.id === liveId)
    : isLiveToolCall(activity, liveId);

/*
 * The group's title owns its live Tool call only while that call is the group's first row,
 * so the call's detail sits right under the title. Behind other rows it is a row of its own (#2044).
 */
function leadsGroup(group: FeedGroup, liveId: string): boolean {
  const first = drawnActivities(group)[0];

  return first ? drawsOnlyLive(first, liveId) : true;
}

export function titledLiveCall(group: FeedGroup): LiveToolCall {
  const live = liveToolCall(group);

  if (!live) return undefined;

  return leadsGroup(group, live.toolCall.id) ? live : undefined;
}

// A live Tool call drawn in the group's title leaves the list, but for any detail it has.
export function visibleActivities(group: FeedGroup): FeedActivity[] {
  const live = titledLiveCall(group);
  const drawn = drawnActivities(group);

  if (!live) return drawn;

  return drawn.flatMap((activity) =>
    activityWithout(activity, live.toolCall.id),
  );
}

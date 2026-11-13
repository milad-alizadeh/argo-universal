import type { LiveHeader } from '@repo/contracts';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';

type LiveToolCall = Extract<FeedGroup, { state: 'open' }>['live'];

type FeedExploration = Extract<FeedActivity, { type: 'exploration' }>;

export const activityKey = (activity: FeedActivity): string =>
  activity.type === 'exploration' ? activity.id : activity.row.id;

const openLive = (group: FeedGroup): LiveToolCall =>
  group.state === 'open' ? group.live : undefined;

export const liveHeaderOf = (group: FeedGroup): LiveHeader | undefined =>
  group.liveHeader;

// A group titled by the live header lists its live Tool call like any other.
export const liveToolCall = (group: FeedGroup): LiveToolCall =>
  liveHeaderOf(group) ? undefined : openLive(group);

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

const onlyLive = (activity: FeedActivity, liveId: string): boolean =>
  activity.type === 'exploration'
    ? activity.toolCalls.every((row) => row.id === liveId)
    : isLiveToolCall(activity, liveId);

/*
 * The group's title owns its live Tool call only while that call is all the group draws,
 * so the call's detail sits right under the title. Behind other rows it is a row of its own (#2044).
 */
export function titledLiveCall(group: FeedGroup): LiveToolCall {
  const live = liveToolCall(group);

  if (!live) return undefined;

  return drawnActivities(group).every((activity) =>
    onlyLive(activity, live.toolCall.id),
  )
    ? live
    : undefined;
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

import type { FeedActivity, FeedGroup } from '../../view/feed-view';

type LiveToolCall = Extract<FeedGroup, { state: 'open' }>['live'];

type FeedExploration = Extract<FeedActivity, { type: 'exploration' }>;

export const activityKey = (activity: FeedActivity): string =>
  activity.type === 'exploration' ? activity.id : activity.row.id;

export const liveToolCall = (group: FeedGroup): LiveToolCall =>
  group.state === 'open' ? group.live : undefined;

// The duration shows while the group runs, unless its live Tool call waits for approval.
export const showsDuration = (group: FeedGroup): boolean =>
  group.state === 'open' && group.live?.awaitingApproval !== true;

function explorationWithout(
  activity: FeedExploration,
  liveId: string,
): FeedActivity[] {
  const remaining = activity.toolCalls.filter((row) => row.id !== liveId);

  return remaining.length ? [{ ...activity, toolCalls: remaining }] : [];
}

const isLiveToolCall = (activity: FeedActivity, liveId: string): boolean =>
  activity.type === 'tool_call' && activity.row.id === liveId;

function activityWithout(
  activity: FeedActivity,
  liveId: string,
): FeedActivity[] {
  if (activity.type === 'exploration')
    return explorationWithout(activity, liveId);

  return isLiveToolCall(activity, liveId) ? [] : [activity];
}

// The live Tool call is drawn in the group's title, so its activity leaves the list.
export function visibleActivities(group: FeedGroup): FeedActivity[] {
  const live = liveToolCall(group);
  const drawn = group.items.filter((activity) => activity.type !== 'thought');

  if (!live) return drawn;

  return drawn.flatMap((activity) =>
    activityWithout(activity, live.toolCall.id),
  );
}

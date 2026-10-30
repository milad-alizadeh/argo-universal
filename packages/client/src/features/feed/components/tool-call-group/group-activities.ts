import type { LiveHeader } from '@repo/contracts';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';

type LiveToolCall = Extract<FeedGroup, { state: 'open' }>['live'];

type FeedExploration = Extract<FeedActivity, { type: 'exploration' }>;

export const activityKey = (activity: FeedActivity): string =>
  activity.type === 'exploration' ? activity.id : activity.row.id;

export const openLive = (group: FeedGroup): LiveToolCall =>
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

import type * as React from 'react';
import {
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import type { FeedActivity, FeedGroup } from '../feed/feed-view';
import { toolCallTitle } from '../feed/tool-call-title';
import { useToolCallDuration } from '../feed/use-tool-call-duration';
import { FeedGrowthContext } from './feed-growth-context';
import { ToolCallDisclosure } from './tool-call-disclosure';
import { toolCallIcon } from './tool-call-icon';

export interface ToolCallGroupProps {
  group: FeedGroup;
  renderActivity: (activity: FeedActivity) => ReactNode;
  initialOpen?: boolean;
  now?: number;
}

const activityKey = (activity: FeedActivity): string =>
  activity.type === 'exploration' ? activity.id : activity.row.id;

// Reports to the Feed when an older page brings activities before those already drawn, and how tall they measure.
function useGrowthAbove(
  groupKey: string,
  keys: readonly string[],
): (event: LayoutChangeEvent) => void {
  const feedGrowth = useContext(FeedGrowthContext);
  const drawnKeys = useRef(keys);
  const height = useRef<number | null>(null);
  const grewAbove = useRef(false);
  useLayoutEffect(() => {
    const [previousFirst] = drawnKeys.current;
    const previousFirstAt =
      previousFirst === undefined ? -1 : keys.indexOf(previousFirst);
    if (
      previousFirstAt > 0 &&
      keys.length - previousFirstAt === drawnKeys.current.length
    ) {
      grewAbove.current = true;
      feedGrowth?.willGrowAbove(groupKey);
    }
    drawnKeys.current = keys;
  });
  return useCallback(
    (event: LayoutChangeEvent) => {
      const previousHeight = height.current;
      height.current = event.nativeEvent.layout.height;
      if (!grewAbove.current || previousHeight === null) return;
      grewAbove.current = false;
      feedGrowth?.grewAbove(groupKey, height.current - previousHeight);
    },
    [groupKey, feedGrowth],
  );
}

export function ToolCallGroup({
  group,
  renderActivity,
  initialOpen,
  now,
}: ToolCallGroupProps): React.JSX.Element {
  const live = group.state === 'open' ? group.live : undefined;
  const duration = useToolCallDuration(live?.toolCall, now);
  const running = group.state === 'open';
  const items = group.items.flatMap<FeedActivity>((activity) => {
    if (!live) return [activity];
    if (activity.type === 'tool_call' && activity.row.id === live.toolCall.id)
      return [];
    if (activity.type === 'exploration') {
      const remaining = activity.toolCalls.filter(
        (row) => row.id !== live.toolCall.id,
      );
      return remaining.length ? [{ ...activity, toolCalls: remaining }] : [];
    }
    return [activity];
  });
  const onActivitiesLayout = useGrowthAbove(group.id, items.map(activityKey));
  return (
    <ToolCallDisclosure
      permissionOutcome={live?.toolCall._meta?.argo?.permissionOutcome}
      label={
        live ? toolCallTitle(live.toolCall, live.awaitingApproval) : group.title
      }
      icon={live ? toolCallIcon(live.toolCall) : 'read'}
      running={running}
      awaitingApproval={live?.awaitingApproval ?? false}
      initialOpen={initialOpen}
      trailing={running && !live?.awaitingApproval ? duration : undefined}
    >
      <View className="gap-2 pb-1 wide:gap-1.5" onLayout={onActivitiesLayout}>
        {items.map((activity) => (
          <View key={activityKey(activity)}>{renderActivity(activity)}</View>
        ))}
      </View>
    </ToolCallDisclosure>
  );
}

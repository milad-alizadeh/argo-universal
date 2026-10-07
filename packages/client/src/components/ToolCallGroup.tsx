import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
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
import { toolCallIcon } from './tool-call-icon';
import { ToolCallDisclosure } from './ToolCallDisclosure';

export interface ToolCallGroupProps {
  group: FeedGroup;
  renderActivity: (activity: FeedActivity) => ReactNode;
  initialOpen?: boolean;
  now?: number;
}

const activityKey = (activity: FeedActivity) =>
  activity.type === 'exploration' ? activity.id : activity.row.id;

// Reports to the Feed when an older page brings activities before those already drawn, and how tall they measure.
function useGrowthAbove(groupKey: string, keys: readonly string[]) {
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
}: ToolCallGroupProps) {
  const toolCalls = group.items.flatMap((activity) => {
    if (activity.type === 'exploration') return activity.toolCalls;
    if (activity.type === 'tool_call') return [activity.row];
    return [];
  });
  const latest = toolCalls.reduce<(typeof toolCalls)[number] | undefined>(
    (previous, row) =>
      !previous || row.position > previous.position ? row : previous,
    undefined,
  );
  const duration = useToolCallDuration(latest, now);
  const running = group.state === 'open';
  const items = group.items.flatMap<FeedActivity>((activity) => {
    if (
      !running ||
      !latest ||
      (latest.status !== 'pending' && latest.status !== 'in_progress')
    )
      return [activity];
    if (activity.type === 'tool_call' && activity.row.id === latest.id)
      return [];
    if (activity.type === 'exploration') {
      const remaining = activity.toolCalls.filter(
        (row) => row.id !== latest.id,
      );
      return remaining.length ? [{ ...activity, toolCalls: remaining }] : [];
    }
    return [activity];
  });
  const onActivitiesLayout = useGrowthAbove(group.id, items.map(activityKey));
  const livePermission =
    running &&
    latest &&
    (latest.status === 'pending' || latest.status === 'in_progress')
      ? latest._meta?.argo?.permissionOutcome
      : undefined;
  return (
    <ToolCallDisclosure
      permissionOutcome={livePermission}
      label={
        running && latest
          ? toolCallTitle(latest, group.title === 'Awaiting approval')
          : group.title
      }
      icon={running && latest ? toolCallIcon(latest) : BookOpenIcon}
      running={running}
      awaitingApproval={group.title === 'Awaiting approval'}
      initialOpen={initialOpen}
      trailing={
        running && group.title !== 'Awaiting approval' ? duration : undefined
      }
    >
      <View className="gap-2 pb-1" onLayout={onActivitiesLayout}>
        {items.map((activity) => (
          <View key={activityKey(activity)}>{renderActivity(activity)}</View>
        ))}
      </View>
    </ToolCallDisclosure>
  );
}

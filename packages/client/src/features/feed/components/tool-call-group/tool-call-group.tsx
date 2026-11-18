import type { LiveHeader } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useToolCallDuration } from '../../hooks/use-tool-call-duration';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';
import { useLiveHeaderTitle } from '../live-header/live-header';
import { ToolCallDisclosure } from '../tool-call-disclosure';
import {
  activityKey,
  liveHeaderOf,
  liveToolCall,
  showsDuration,
  headerLiveCall,
  visibleActivities,
} from './group-activities';
import { GroupChild } from './group-child';
import { groupHeaderProps } from './group-header-props';
import { groupImageAside } from './group-images';
import { GroupLiveId } from './group-live-id';
import { useGrowthAbove } from './use-growth-above';

const idleHeader: LiveHeader = {
  text: '',
  startedAt: null,
  source: { type: 'working' },
};

export interface ToolCallGroupProps {
  group: FeedGroup;
  renderActivity: (activity: FeedActivity) => ReactNode;
  initialOpen?: boolean;
  now?: number;
}

interface GroupActivitiesProps {
  items: FeedActivity[];
  onLayout: (event: LayoutChangeEvent) => void;
  renderActivity: ToolCallGroupProps['renderActivity'];
}

function useGroupTrailing(group: FeedGroup, now?: number): string | undefined {
  const duration = useToolCallDuration(liveToolCall(group)?.toolCall, now);

  return showsDuration(group) ? duration : undefined;
}

function useGroupActivities(
  group: FeedGroup,
): Omit<GroupActivitiesProps, 'renderActivity'> {
  const items = visibleActivities(group);

  return { items, onLayout: useGrowthAbove(group.id, items.map(activityKey)) };
}

function GroupActivities({
  items,
  onLayout,
  renderActivity,
}: GroupActivitiesProps): React.JSX.Element {
  return (
    <View className="gap-2 wide-type:gap-1.5" onLayout={onLayout}>
      {items.map((activity) => (
        <View key={activityKey(activity)}>{renderActivity(activity)}</View>
      ))}
    </View>
  );
}

// One component whether or not a live header titles the group, so the header coming and going keeps the open state.
function GroupBody(props: ToolCallGroupProps): React.JSX.Element {
  const activities = useGroupActivities(props.group);
  const live = headerLiveCall(props.group);

  return (
    <GroupLiveId value={live?.toolCall.id}>
      <GroupChild value>
        <GroupActivities
          {...activities}
          renderActivity={props.renderActivity}
        />
      </GroupChild>
    </GroupLiveId>
  );
}

export function ToolCallGroup(props: ToolCallGroupProps): React.JSX.Element {
  const liveHeader = liveHeaderOf(props.group);
  const title = useLiveHeaderTitle(liveHeader ?? idleHeader, props.now);
  const trailing = useGroupTrailing(props.group, props.now);

  return (
    <ToolCallDisclosure
      {...groupHeaderProps(props.group, liveHeader, title)}
      initialOpen={props.initialOpen}
      trailing={liveHeader ? undefined : trailing}
      aside={groupImageAside(props.group)}
    >
      <GroupBody {...props} />
    </ToolCallDisclosure>
  );
}

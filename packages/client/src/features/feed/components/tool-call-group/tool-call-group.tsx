import type { LiveHeader } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useToolCallDuration } from '../../hooks/use-tool-call-duration';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';
import {
  LiveTitle,
  SourceIcon,
  useLiveHeaderTitle,
} from '../live-header/live-header';
import {
  ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { toolCallIcon } from '../tool-call-icon';
import {
  activityKey,
  liveHeaderOf,
  liveToolCall,
  showsDuration,
  visibleActivities,
} from './group-activities';
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

type GroupDisclosureProps = Pick<
  React.ComponentProps<typeof ToolCallDisclosure>,
  | 'label'
  | 'paths'
  | 'icon'
  | 'running'
  | 'awaitingApproval'
  | 'permissionOutcome'
>;

function groupDisclosureProps(group: FeedGroup): GroupDisclosureProps {
  const live = liveToolCall(group);
  const running = group.state === 'open';

  return live
    ? {
        ...toolCallDisclosureProps(live.toolCall, live.awaitingApproval),
        icon: toolCallIcon(live.toolCall),
        running,
      }
    : { label: group.title, paths: [], icon: 'read' as const, running };
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
    <View className="gap-2 pb-1 wide-type:gap-1.5" onLayout={onLayout}>
      {items.map((activity) => (
        <View key={activityKey(activity)}>{renderActivity(activity)}</View>
      ))}
    </View>
  );
}

function liveHeaderDisclosureProps(
  { source }: LiveHeader,
  title: string,
): Pick<
  React.ComponentProps<typeof ToolCallDisclosure>,
  'label' | 'leading' | 'title'
> {
  return {
    label: title,
    leading: <SourceIcon source={source} />,
    title: <LiveTitle title={title} source={source} />,
  };
}

function groupHeaderProps(
  group: FeedGroup,
  liveHeader: LiveHeader | undefined,
  title: string,
):
  | ReturnType<typeof groupDisclosureProps>
  | ReturnType<typeof liveHeaderDisclosureProps> {
  return liveHeader
    ? liveHeaderDisclosureProps(liveHeader, title)
    : groupDisclosureProps(group);
}

// One component whether or not a live header titles the group, so the header coming and going keeps the open state.
export function ToolCallGroup(props: ToolCallGroupProps): React.JSX.Element {
  const liveHeader = liveHeaderOf(props.group);
  const title = useLiveHeaderTitle(liveHeader ?? idleHeader, props.now);
  const trailing = useGroupTrailing(props.group, props.now);
  const activities = useGroupActivities(props.group);

  return (
    <ToolCallDisclosure
      {...groupHeaderProps(props.group, liveHeader, title)}
      initialOpen={props.initialOpen}
      trailing={liveHeader ? undefined : trailing}
    >
      <GroupActivities {...activities} renderActivity={props.renderActivity} />
    </ToolCallDisclosure>
  );
}

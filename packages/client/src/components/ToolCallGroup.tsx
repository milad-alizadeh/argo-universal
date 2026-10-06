import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import type { FeedActivity, FeedGroup } from '../feed/feed-view';
import { toolCallTitle } from '../feed/tool-call-title';
import { useToolCallDuration } from '../feed/use-tool-call-duration';
import { FeedDisclosure } from './FeedDisclosure';

export interface ToolCallGroupProps {
  group: FeedGroup;
  renderActivity: (activity: FeedActivity) => ReactNode;
  initialOpen?: boolean;
  now?: number;
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
    if (!running || !latest) return [activity];
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
  return (
    <FeedDisclosure
      label={latest ? toolCallTitle(latest) : group.title}
      icon={BookOpenIcon}
      running={running}
      initialOpen={initialOpen}
      trailing={
        duration && (
          <Text className="shrink-0 text-sm leading-5 text-muted-foreground">
            {duration}
          </Text>
        )
      }
    >
      <View className="gap-2 pb-1">
        {items.map((activity) => (
          <View
            key={
              activity.type === 'exploration' ? activity.id : activity.row.id
            }
          >
            {renderActivity(activity)}
          </View>
        ))}
      </View>
    </FeedDisclosure>
  );
}

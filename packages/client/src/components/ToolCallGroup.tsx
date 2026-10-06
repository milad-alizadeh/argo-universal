import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { FeedActivity, FeedGroup } from '../feed/feed-view';
import { toolCallTitle } from '../feed/tool-call-title';
import { FeedDisclosure } from './FeedDisclosure';

export interface ToolCallGroupProps {
  group: FeedGroup;
  renderActivity: (activity: FeedActivity) => ReactNode;
  initialOpen?: boolean;
}

export function ToolCallGroup({
  group,
  renderActivity,
  initialOpen,
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
  return (
    <FeedDisclosure
      label={latest ? toolCallTitle(latest) : group.title}
      icon={BookOpenIcon}
      running={group.state === 'open'}
      initialOpen={initialOpen}
    >
      <View className="gap-2 pb-1">
        {group.items.map((activity) => (
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

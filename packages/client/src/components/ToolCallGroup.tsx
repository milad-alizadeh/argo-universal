import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { FeedActivity, FeedGroup } from '../feed/feed-view';
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
  return (
    <FeedDisclosure
      label={group.title}
      icon={BookOpenIcon}
      running={group.state === 'open'}
      initialOpen={initialOpen}
    >
      <View className="gap-2 pb-1">
        {group.items
          .filter(
            (activity) =>
              !(
                group.state === 'open' &&
                activity.type === 'tool_call' &&
                (activity.row.status === 'pending' ||
                  activity.row.status === 'in_progress') &&
                activity.row.title === group.title
              ),
          )
          .map((activity) => (
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

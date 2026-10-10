import type * as React from 'react';
import { View } from 'react-native';
import type { FeedActivity } from '../view/feed-view';
import { CommandRow } from './command-row';
import { ToolCallRow } from './tool-call-row';

export function renderRecordedActivity(
  activity: FeedActivity,
): React.JSX.Element {
  if (activity.type === 'exploration')
    return (
      <View className="gap-2">
        {activity.toolCalls.map((row) => (
          <ToolCallRow key={row.id} row={row} />
        ))}
      </View>
    );
  if (activity.type === 'tool_call')
    return (
      <CommandRow
        row={activity.row}
        awaitingApproval={activity.awaitingApproval}
        now={(activity.row._meta?.argo?.startedAt ?? 0) + 23000}
      />
    );
  throw new Error('This recording needs only commands and exploration');
}

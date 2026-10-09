import type * as React from 'react';
import { View } from 'react-native';
import { CommandRow } from '../src/components/command-row';
import { ToolCallRow } from '../src/components/tool-call-row';
import type { FeedActivity } from '../src/feed/feed-view';

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

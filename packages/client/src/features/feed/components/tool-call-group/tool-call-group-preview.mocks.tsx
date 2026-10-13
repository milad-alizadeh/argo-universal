import type * as React from 'react';
import { View } from 'react-native';
import type { FeedActivity } from '../../view/feed-view';
import { CommandRow } from '../command-row/command-row';
import { startedAt } from '../recorded-tool-calls.mocks';
import { ToolCallRow } from '../tool-call-row/tool-call-row';

type Exploration = Extract<FeedActivity, { type: 'exploration' }>;
type ToolCallActivity = Extract<FeedActivity, { type: 'tool_call' }>;

function RecordedExploration({
  activity,
}: {
  activity: Exploration;
}): React.JSX.Element {
  return (
    <View className="gap-2">
      {activity.toolCalls.map((row) => (
        <ToolCallRow key={row.id} row={row} />
      ))}
    </View>
  );
}

function RecordedCommand({
  activity,
}: {
  activity: ToolCallActivity;
}): React.JSX.Element {
  return (
    <CommandRow
      row={activity.row}
      awaitingApproval={activity.awaitingApproval}
      now={startedAt(activity.row) + 23000}
    />
  );
}

export function renderRecordedActivity(
  activity: FeedActivity,
): React.JSX.Element {
  if (activity.type === 'exploration')
    return <RecordedExploration activity={activity} />;
  if (activity.type === 'tool_call')
    return <RecordedCommand activity={activity} />;
  throw new Error('This recording needs only commands and exploration');
}

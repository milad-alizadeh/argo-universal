import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import type { FeedDelegated } from '../view/feed-view';
import { SubagentRow } from './subagent-row/subagent-row';

export function DelegatedFeedRow({
  item,
}: {
  item: FeedDelegated;
}): React.JSX.Element {
  const source = (
    <SubagentRow
      item={{
        type: 'subagent',
        id: item.id,
        subagentSessionId: item.sourceSessionId,
        title: item.title,
        kind: item.kind,
        role: null,
      }}
      onOpen={item.onOpen}
    />
  );

  if (item.kind !== 'offered_skill') return source;

  return (
    <View className="min-w-0 gap-2">
      {source}
      <Text>{item.command}</Text>
      <View className="self-start">
        <Button
          label="Run skill"
          variant="secondary"
          size="sm"
          disabled={item.confirming}
          onPress={item.onConfirm}
        />
      </View>
    </View>
  );
}

import { Text, TextClassContext } from '@repo/kit/primitives/content/text';
import { Menu } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { Pressable, View } from 'react-native';
import type { FeedDelegated, FeedSubagent } from '../view/feed-view';
import { rowColour, rowLabel } from './subagent-row/subagent-line';
import { SubagentRow, SubagentRowBody } from './subagent-row/subagent-row';

export function DelegatedFeedRow({
  item,
}: {
  item: FeedDelegated;
}): React.JSX.Element {
  const source: FeedSubagent = {
    type: 'subagent',
    id: item.id,
    subagentSessionId: item.sourceSessionId,
    title: item.title,
    kind: item.kind,
    role: null,
  };

  if (item.kind !== 'offered_skill')
    return <SubagentRow item={source} onOpen={item.onOpen} />;

  return <SkillOffer item={item} source={source} />;
}

function SkillOffer({
  item,
  source,
}: {
  item: Extract<FeedDelegated, { kind: 'offered_skill' }>;
  source: FeedSubagent;
}): React.JSX.Element {
  return (
    <View className="min-w-0 items-start gap-2">
      <Menu
        accessibilityLabel={rowLabel(source)}
        trigger={
          <Pressable role="button" className="max-w-full self-start">
            <TextClassContext.Provider value={rowColour(false)}>
              <SubagentRowBody item={source} opens />
            </TextClassContext.Provider>
          </Pressable>
        }
        actions={[
          {
            label: 'Run skill',
            disabled: item.confirming,
            onPress: item.onConfirm,
          },
          { label: 'Open starter Session', onPress: item.onOpen },
        ]}
      />
      <Text>{item.command}</Text>
    </View>
  );
}

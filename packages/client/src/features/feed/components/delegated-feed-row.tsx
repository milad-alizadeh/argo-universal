import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';
import { View } from 'react-native';
import { ElicitationForm } from '#features/requests';
import type { FeedDelegated, FeedSubagent } from '../view/feed-view';
import { SubagentRow } from './subagent-row/subagent-row';

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
    <View className="min-w-0 max-w-column gap-2">
      <SubagentRow item={source} onOpen={item.onOpen} />
      <Surface kind="card">
        <ElicitationForm
          request={{
            requestId: item.id,
            mode: 'form',
            message: item.command,
            requestedSchema: { properties: {} },
          }}
          state={{ kind: item.answering ? 'submitting' : 'open' }}
          error={item.error}
          onAnswer={({ action }) =>
            item.onAnswer(action === 'accept' ? 'run' : 'skip')
          }
        />
      </Surface>
    </View>
  );
}

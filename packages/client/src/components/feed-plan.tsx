import type { Plan } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { FeedMarkdown } from './feed-markdown';
import { FeedReference } from './feed-reference';

export function FeedPlan({ plan }: { plan: Plan }): React.JSX.Element | null {
  if (plan.type === 'file')
    return <FeedReference title="Plan" uri={plan.uri} />;
  if (plan.type !== 'markdown') return null;
  return (
    <View className="gap-2 border-l-2 border-border pl-3">
      <Text className="text-sm font-medium text-muted-foreground">Plan</Text>
      <FeedMarkdown text={plan.content} />
    </View>
  );
}

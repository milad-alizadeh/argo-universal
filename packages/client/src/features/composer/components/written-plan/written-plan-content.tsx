import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { FeedCodeBlock } from '#lib/product/markdown/feed-code-block/feed-code-block';
import { PlanDocument } from '#lib/product/plan-document';
import type { WrittenPlanValue } from './written-plan-types';
interface ContentProps {
  plan: WrittenPlanValue;
  title: string;
  layout: 'tray' | 'sheet';
}
export function WrittenPlanContent({
  plan,
  title,
  layout,
}: ContentProps): React.JSX.Element {
  return (
    <View role="region" accessibilityLabel="Written plan content">
      {plan.type === 'markdown' ? (
        <PlanDocument content={plan.content} layout={layout} />
      ) : (
        <PlanReference plan={plan} title={title} />
      )}
    </View>
  );
}
interface PlanReferenceProps {
  plan: Extract<WrittenPlanValue, { type: 'file' }>;
  title: string;
}
function PlanReference({ plan, title }: PlanReferenceProps): React.JSX.Element {
  return (
    <View className="gap-2 px-4 pt-2 pb-4">
      <FeedCodeBlock resource={{ name: title, uri: plan.uri }} />
      <Text role="secondary">
        The Agent shared where the plan is, not its text.
      </Text>
    </View>
  );
}

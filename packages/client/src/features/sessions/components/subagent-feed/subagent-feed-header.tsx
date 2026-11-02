import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { useClock } from '@repo/kit/use-clock';
import type * as React from 'react';
import { View } from 'react-native';
import { SessionColumn } from '#lib/product/session-column';
import { subagentFeedMeta } from './subagent-feed-meta';
import type { SubagentFeedProps } from './subagent-feed-props';

type HeaderProps = Omit<SubagentFeedProps, 'feed'>;

export const subagentFeedBackLabel = 'Back to Agents';

// Back hangs in the column's 24 gutter, so the title starts where the Feed's rows do, at either Inspector width.
function BackButton({
  onBack,
}: Pick<HeaderProps, 'onBack'>): React.JSX.Element {
  return (
    <View className="absolute inset-y-0 -left-6 justify-center">
      <IconButton
        variant="ghost"
        size="sm"
        icon="back"
        accessibilityLabel={subagentFeedBackLabel}
        onPress={onBack}
      />
    </View>
  );
}

// The Inspector draws the Subagent's title on one line, as the pane's own title sits.
function Title({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text
        role="control"
        accessibilityRole="heading"
        aria-level={3}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}

// How the Subagent is doing. Only a running one counts up; the others hold a settled line.
function Meta({
  subagent,
  now,
}: Omit<HeaderProps, 'onBack'>): React.JSX.Element {
  const clock = useClock(subagent.state === 'running', now);

  return (
    <Text role="badge" tone="muted">
      {subagentFeedMeta(subagent, clock)}
    </Text>
  );
}

// The drilled-in Subagent's line in the Inspector, on the Feed's column: Back to the list, its title, and how it is doing.
export function SubagentFeedHeader({
  subagent,
  onBack,
  now,
}: HeaderProps): React.JSX.Element {
  return (
    <SessionColumn className="h-frame-control shrink-0 flex-row items-center gap-1.5">
      <BackButton onBack={onBack} />
      <Title title={subagent.title} />
      <Meta subagent={subagent} now={now} />
    </SessionColumn>
  );
}

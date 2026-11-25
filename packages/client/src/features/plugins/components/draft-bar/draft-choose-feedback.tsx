import type { IconSymbol } from '@repo/contracts/kit-symbols';
import { FixedSizeChrome } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DraftChooseFeedback } from '../../hooks/use-draft-choose';

const feedbackLooks = {
  delivered: {
    title: 'Sent to drawing Session',
    icon: 'check',
    tone: 'success',
  },
  refused: {
    title: 'Couldn’t send your choice',
    icon: 'close',
    tone: 'danger',
  },
  'no-session': {
    title: 'No drawing Session yet',
    icon: { sf: 'exclamationmark.circle', material: 'error' },
    tone: 'warning',
  },
} as const satisfies Record<
  DraftChooseFeedback['kind'],
  { title: string; icon: IconSymbol; tone: 'success' | 'danger' | 'warning' }
>;

export function DraftChooseFeedbackCard({
  feedback,
  onDismiss,
}: {
  feedback: DraftChooseFeedback;
  onDismiss: () => void;
}): ReactElement {
  const { title, icon, tone } = feedbackLooks[feedback.kind];
  const delivered = feedback.kind === 'delivered';

  return (
    <View pointerEvents="box-none" className="w-full items-center px-5">
      <View
        role={delivered ? 'status' : 'alert'}
        accessibilityLiveRegion={delivered ? 'polite' : 'assertive'}
        className="w-full max-w-draft-feedback-compact flex-row items-start gap-2.5 rounded-draft-feedback border border-border bg-card p-3 shadow-raised wide:max-w-draft-feedback"
      >
        <FixedSizeChrome>
          <Icon size="sm" name={icon} tone={tone} />
        </FixedSizeChrome>
        <View className="min-w-0 flex-1 gap-0.75">
          <Text
            role="heading"
            aria-level={2}
            className="font-sans font-semibold text-foreground text-draft-feedback-title leading-draft-feedback-title"
          >
            {title}
          </Text>
          <Text className="font-sans text-muted-foreground text-draft-feedback leading-draft-feedback">
            {feedback.message}
          </Text>
        </View>
        {!delivered && <DismissFeedback onPress={onDismiss} />}
      </View>
    </View>
  );
}

function DismissFeedback({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Dismiss"
      hitSlop={8}
      onPress={onPress}
    >
      <FixedSizeChrome>
        <Icon name="close" size="sm" tone="muted" />
      </FixedSizeChrome>
    </Pressable>
  );
}

import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import { countBadge } from '../../../badge-count';
import type { CountBadgeProps } from './count-badge-props';

const tones = {
  danger: 'bg-danger',
  success: 'bg-success',
  muted: 'bg-muted-foreground',
} as const;

// Argo's count capsule: attention red by default; running and finished counts use their status tone.
export function CountBadge(props: CountBadgeProps): React.JSX.Element | null {
  const badge = countBadge(props.badge);

  if (!badge) return null;

  return (
    <View accessibilityLabel={badge.label} className={badgeClass(props.tone)}>
      <Text role="badge" selectable={false} className="text-primary-foreground">
        {badge.text}
      </Text>
    </View>
  );
}

const badgeClass = (tone: CountBadgeProps['tone']): string =>
  cn(
    'h-4 min-w-4 items-center justify-center rounded-full px-1',
    tones[tone ?? 'danger'],
  );

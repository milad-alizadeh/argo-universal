import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { countBadge } from '../../../badge-count';
import type { CountBadgeProps } from './count-badge-props';

// Argo's count capsule in danger red, on Argo-drawn rows and the rail; native rows draw their platform's badge.
export function CountBadge(props: CountBadgeProps): React.JSX.Element | null {
  const badge = countBadge(props.badge);

  if (!badge) return null;

  return (
    <View
      accessibilityLabel={badge.label}
      className="h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1"
    >
      <Text role="badge" selectable={false} className="text-primary-foreground">
        {badge.text}
      </Text>
    </View>
  );
}

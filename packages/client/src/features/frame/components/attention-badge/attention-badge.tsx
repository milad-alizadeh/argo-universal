import type { BadgeCount } from '@repo/kit/badge-count';
import { CountBadge } from '@repo/kit/primitives/status/count-badge';
import type * as React from 'react';
import { View } from 'react-native';

// On a rail tile's corner, the section's count, such as the Sessions that need input or a Plugin's own; nothing when it is zero.
export function AttentionBadge({
  badge,
}: {
  badge: BadgeCount;
}): React.JSX.Element {
  return (
    <View pointerEvents="none" className="absolute right-1.5 top-1">
      <CountBadge badge={badge} />
    </View>
  );
}

import { CountBadge } from '@repo/kit/primitives/status/count-badge';
import type * as React from 'react';
import { View } from 'react-native';
import { attentionBadge } from '../../utils/attention-badge';

// On a rail tile's corner, the count of Sessions that need input or are Unread; nothing when none do.
export function AttentionBadge({
  count,
}: {
  count: number;
}): React.JSX.Element {
  return (
    <View pointerEvents="none" className="absolute right-1.5 top-1">
      <CountBadge badge={attentionBadge(count)} />
    </View>
  );
}

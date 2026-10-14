import type * as React from 'react';
import { Badge } from '#primitives/display/badge';
import { Text } from '#primitives/display/text';
import {
  type AttentionBadge as Badged,
  attentionBadge,
} from '../../state/attention-badge';

interface AttentionBadgeProps {
  count: number;
}

function BadgeMark({ badge }: { badge: Badged }): React.JSX.Element {
  return (
    <Badge
      pointerEvents="none"
      className="absolute right-0.5 top-0.5 min-w-4 border-0 bg-warning px-1 py-0"
      accessibilityLabel={badge.label}
    >
      <Text role="badge" className="text-warning-foreground">
        {badge.text}
      </Text>
    </Badge>
  );
}

// On a rail tile's corner, the count of Sessions that need input or are Unread; nothing when none do.
export function AttentionBadge({
  count,
}: AttentionBadgeProps): React.JSX.Element | null {
  const badge = attentionBadge(count);

  return badge && <BadgeMark badge={badge} />;
}

import type * as React from 'react';
import type { ViewProps } from 'react-native';
import { Badge } from '#lib/generic/primitives/display/badge/badge';
import { Text } from '#lib/generic/primitives/display/text/text';
import {
  type AttentionBadge as Badged,
  attentionBadge,
} from '../../state/attention-badge';

type Placement = 'rail' | 'drawer';

interface AttentionBadgeProps {
  count: number;
  // On a rail tile's corner, or at the end of a drawer row.
  placement: Placement;
}

const placementProps = {
  rail: {
    pointerEvents: 'none',
    className:
      'absolute right-0.5 top-0.5 min-w-4 border-0 bg-warning px-1 py-0',
  },
  drawer: {
    className:
      'h-phone-shell-badge min-w-phone-shell-badge border-0 bg-warning px-1.5',
  },
} as const satisfies Record<Placement, ViewProps>;

function BadgeMark({
  badge,
  placement,
}: {
  badge: Badged;
  placement: Placement;
}): React.JSX.Element {
  return (
    <Badge {...placementProps[placement]} accessibilityLabel={badge.label}>
      <Text role="badge" className="text-warning-foreground">
        {badge.text}
      </Text>
    </Badge>
  );
}

// The count of Sessions that need input or are Unread; nothing when none do.
export function AttentionBadge({
  count,
  placement,
}: AttentionBadgeProps): React.JSX.Element | null {
  const badge = attentionBadge(count);
  return badge && <BadgeMark badge={badge} placement={placement} />;
}

// A drawer row's badge with what a screen reader says for it, since Android reads the row as one description.
export function drawerAttentionBadge(
  count: number,
): { element: React.JSX.Element; label: string } | undefined {
  const badge = attentionBadge(count);
  if (!badge) return undefined;
  return {
    label: badge.label,
    element: <BadgeMark badge={badge} placement="drawer" />,
  };
}

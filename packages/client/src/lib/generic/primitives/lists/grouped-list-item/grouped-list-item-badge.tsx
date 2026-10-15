import type * as React from 'react';
import { badgeCountText } from '#lib/generic/badge-count';
import { Badge } from '#primitives/display/badge';
import { Text } from '#primitives/display/text';
import type { GroupedListItemProps } from './grouped-list-item-props';

// The web row's count on the muted capsule, before the chevron; the row's name already says it.
export function RowBadge({
  badge,
}: Pick<GroupedListItemProps, 'badge'>): React.JSX.Element | null {
  const text = badgeCountText(badge);

  if (text === undefined) return null;

  return (
    <Badge variant="secondary" aria-hidden>
      <Text>{text}</Text>
    </Badge>
  );
}

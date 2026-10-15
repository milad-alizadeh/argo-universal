import { Badge, Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { countBadge } from '#lib/generic/badge-count';
import type { GroupedListItemProps } from './grouped-list-item-props';

// Material's own Badge with its count, in its default error colours; TalkBack reads it with the row's name.
export function NativeRowBadge(
  props: Pick<GroupedListItemProps, 'badge' | 'badgeLabel'>,
): React.JSX.Element | null {
  const badge = countBadge(props.badge, props.badgeLabel);

  if (!badge) return null;

  return (
    <Badge>
      <Text>{badge.text}</Text>
    </Badge>
  );
}

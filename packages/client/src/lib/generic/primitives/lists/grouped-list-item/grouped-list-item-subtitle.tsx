import { Text } from '@expo/ui';
import type * as React from 'react';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { subtitleRole, useRowText } from './grouped-list-item-text';

// The subtitle reflows under the title, such as an Agent's setup explanation.
export function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  const text = useRowText(subtitleRole(subtitle), 'secondary');

  return subtitle ? (
    <Text {...text} numberOfLines={subtitle.numberOfLines}>
      {subtitle.text}
    </Text>
  ) : null;
}

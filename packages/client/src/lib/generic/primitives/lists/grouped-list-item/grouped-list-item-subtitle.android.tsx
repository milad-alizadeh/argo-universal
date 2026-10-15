// Universal Text on Android omits Compose's overflow prop, so capped subtitles need stock Text to end in an ellipsis.
import { Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { RowSubtitle as UniversalRowSubtitle } from './grouped-list-item-subtitle.tsx';
import { subtitleRole } from './grouped-list-item-text';

export function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  const style = useUniversalTextStyle(subtitleRole(subtitle));

  if (!subtitle?.numberOfLines)
    return <UniversalRowSubtitle subtitle={subtitle} />;

  return (
    <Text style={style} maxLines={subtitle.numberOfLines} overflow="ellipsis">
      {subtitle.text}
    </Text>
  );
}

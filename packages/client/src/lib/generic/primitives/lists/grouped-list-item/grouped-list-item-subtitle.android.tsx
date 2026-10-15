// Universal Text on Android omits Compose's overflow prop, so capped subtitles need stock Text to end in an ellipsis.
import { Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { RowSubtitle as UniversalRowSubtitle } from './grouped-list-item-subtitle.tsx';
import { subtitleRole, useRowText } from './grouped-list-item-text';

export function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  const { textStyle } = useRowText(subtitleRole(subtitle), 'secondary');

  if (!subtitle?.numberOfLines)
    return <UniversalRowSubtitle subtitle={subtitle} />;

  return (
    <CappedSubtitle
      text={subtitle.text}
      lines={subtitle.numberOfLines}
      style={textStyle}
    />
  );
}

type CappedProps = {
  text: string;
  lines: number;
  style: React.ComponentProps<typeof Text>['style'];
};

function CappedSubtitle(props: CappedProps): React.JSX.Element {
  return (
    <Text style={props.style} maxLines={props.lines} overflow="ellipsis">
      {props.text}
    </Text>
  );
}

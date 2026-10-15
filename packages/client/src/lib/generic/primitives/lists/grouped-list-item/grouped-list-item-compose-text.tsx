import { Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListItemProps } from './grouped-list-item-props';
import {
  subtitleRole,
  titleRole,
  useToneColor,
} from './grouped-list-item-text';

// The Compose row's title in its tone's colour.
export function RowTitle(
  props: Pick<GroupedListItemProps, 'label' | 'tone' | 'code'>,
): React.JSX.Element {
  const style = useComposeTextStyle(titleRole(props.code));
  const { foreground } = useNativeTheme().colors;

  return (
    <Text color={useToneColor(props.tone) ?? foreground} style={style}>
      {props.label}
    </Text>
  );
}

// The subtitle reflows under the title, such as an Agent's setup explanation.
export function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  const style = useComposeTextStyle(subtitleRole(subtitle));
  const { mutedForeground } = useNativeTheme().colors;
  const tight = useResolveClassNames('leading-4').lineHeight;

  if (!subtitle) return null;

  // A path's one line sits close under the title, as Material's supporting text does.
  const lineHeight = subtitle.code ? tight : style.lineHeight;

  return (
    <Text color={mutedForeground} style={{ ...style, lineHeight }}>
      {subtitle.text}
    </Text>
  );
}

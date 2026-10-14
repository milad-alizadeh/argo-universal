import { Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import type { ListItemProps } from '../../fields/field-props';
import { useComposeTextStyle } from '../../native/native-typography';
import { subtitleRole, titleRole, useToneColor } from './list-item-text';

// The Compose row's title in its tone's colour.
export function RowTitle(
  props: Pick<ListItemProps, 'title' | 'tone' | 'code'>,
): React.JSX.Element {
  const style = useComposeTextStyle(titleRole(props.code));
  const { foreground } = useNativeTheme().colors;

  return (
    <Text color={useToneColor(props.tone) ?? foreground} style={style}>
      {props.title}
    </Text>
  );
}

// The subtitle reflows under the title, such as an Agent's setup explanation.
export function RowSubtitle({
  subtitle,
}: Pick<ListItemProps, 'subtitle'>): React.JSX.Element | null {
  const style = useComposeTextStyle(subtitleRole(subtitle));
  const { mutedForeground } = useNativeTheme().colors;

  if (!subtitle) return null;

  return (
    <Text color={mutedForeground} style={style}>
      {subtitle.text}
    </Text>
  );
}

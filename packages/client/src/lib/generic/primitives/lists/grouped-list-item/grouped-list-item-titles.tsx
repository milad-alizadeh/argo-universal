import { Column, Text } from '@expo/ui';
import { weight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { RowSubtitle } from './grouped-list-item-subtitle';
import { titleRole, useRowText } from './grouped-list-item-text';

// On Android the titles take the row's spare width, so the value and status trail them on the same line; iOS's Label does that itself.
const titleModifiers = Platform.OS === 'ios' ? undefined : [weight(1)];

export function RowTitles(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Column spacing={0} modifiers={titleModifiers}>
      <RowTitle {...props} />
      <RowSubtitle subtitle={props.subtitle} />
    </Column>
  );
}

function RowTitle(props: GroupedListItemProps): React.JSX.Element {
  const text = useRowText(titleRole(props.code), props.tone ?? 'primary');

  return <Text {...text}>{props.label}</Text>;
}

import { Column } from '@expo/ui';
import { weight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { NativeText } from '#primitives/display/native-text';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { RowSubtitle } from './grouped-list-item-subtitle';
import { rowColor } from './grouped-list-item-text';

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
  return (
    <NativeText
      code={props.code}
      tone={props.tone}
      modifiers={rowColor(props.tone ?? 'primary')}
    >
      {props.label}
    </NativeText>
  );
}

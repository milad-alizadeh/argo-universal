import { Column } from '@expo/ui';
import { weight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { NativeText } from '#primitives/display/native-text';
import { rowHeadlineAccessibility } from './grouped-list-item-accessibility';
import type { ResolvedItemProps } from './grouped-list-item-props';
import { RowSubtitle } from './grouped-list-item-subtitle';
import { rowColor } from './grouped-list-item-text';

// On Android the titles take the row's spare width, so the value and status trail them on the same line; iOS's Label does that itself.
const titleModifiers = Platform.OS === 'ios' ? undefined : [weight(1)];

export function RowTitles(props: ResolvedItemProps): React.JSX.Element {
  return (
    <Column
      spacing={0}
      modifiers={[
        ...(titleModifiers ?? []),
        ...rowHeadlineAccessibility(props),
      ]}
    >
      <RowTitle {...props} />
      <RowSubtitle subtitle={props.subtitle} />
    </Column>
  );
}

// The label keeps one line and ends in an ellipsis before the row's trailing accessory or chevron.
function RowTitle(props: ResolvedItemProps): React.JSX.Element {
  return (
    <NativeText
      numberOfLines={1}
      code={props.code}
      tone={props.tone}
      modifiers={rowColor(props.tone ?? 'primary')}
    >
      {props.label}
    </NativeText>
  );
}

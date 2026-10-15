import { Column, type RowProps, Row, Text } from '@expo/ui';
import { weight } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityHidden,
  fixedSize,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { subtitleRole, titleRole, useRowText } from './grouped-list-item-text';
import { NativeRowImage, NativeRowStatus } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

const trailingSpacing = 8;

// The label takes the row's spare width, so the value and status trail it on the same line.
export function RowLabel(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Column spacing={0} modifiers={labelModifiers(props)}>
      <RowTitle {...props} />
      <RowSubtitle subtitle={props.subtitle} />
    </Column>
  );
}

function labelModifiers(props: GroupedListItemProps): Modifiers {
  if (!ios) return [weight(1)];

  return [
    frame({ maxWidth: Infinity, alignment: 'leading' }),
    accessibilityHidden(!!props.control),
  ];
}

function RowTitle(props: GroupedListItemProps): React.JSX.Element {
  const text = useRowText(titleRole(props.code), props.tone ?? 'primary');

  return <Text {...text}>{props.label}</Text>;
}

// The subtitle reflows under the title, such as an Agent's setup explanation.
function RowSubtitle({
  subtitle,
}: Pick<GroupedListItemProps, 'subtitle'>): React.JSX.Element | null {
  const text = useRowText(subtitleRole(subtitle), 'secondary', 'line');

  return subtitle ? <Text {...text}>{subtitle.text}</Text> : null;
}

const trailingModifiers: Modifiers | undefined = ios
  ? [fixedSize({ horizontal: false, vertical: true })]
  : undefined;

export function RowTrailing(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Row
      alignment="center"
      spacing={trailingSpacing}
      modifiers={trailingModifiers}
    >
      <RowValue {...props} />
      <NativeRowStatus {...props} />
    </Row>
  );
}

function RowValue(
  props: Pick<GroupedListItemProps, 'value' | 'valueLeading'>,
): React.JSX.Element {
  return (
    <>
      {props.valueLeading && <NativeRowImage image={props.valueLeading} />}
      {props.value !== undefined && <RowValueText value={props.value} />}
    </>
  );
}

// Android keeps the value to one line at the row's end, as the title takes the width.
function RowValueText({ value }: { value: string }): React.JSX.Element {
  const text = useRowText('body', 'secondary');

  if (ios) return <Text {...text}>{value}</Text>;

  return (
    <Text
      textStyle={{ ...text.textStyle, textAlign: 'right' }}
      numberOfLines={1}
    >
      {value}
    </Text>
  );
}

import { type RowProps, Row, Text } from '@expo/ui';
import { fixedSize } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import {
  rowValueAccessibility,
  type RowTextAccessibilityProps,
} from './grouped-list-item-accessibility';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { useRowText } from './grouped-list-item-text';
import { NativeRowImage } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

const trailingSpacing = 8;

const trailingModifiers: Modifiers | undefined = ios
  ? [fixedSize({ horizontal: false, vertical: true })]
  : undefined;

export function RowTrailing(
  props: GroupedListItemProps,
): React.JSX.Element | null {
  if (props.value === undefined && !props.valueLeading) return null;

  return (
    <Row
      alignment="center"
      spacing={trailingSpacing}
      modifiers={trailingModifiers}
    >
      <RowValue {...props} />
    </Row>
  );
}

type RowValueProps = RowTextAccessibilityProps &
  Pick<GroupedListItemProps, 'value' | 'valueLeading'>;

function RowValue(props: RowValueProps): React.JSX.Element {
  return (
    <>
      {props.valueLeading && <NativeRowImage image={props.valueLeading} />}
      {props.value !== undefined && (
        <RowValueText
          value={props.value}
          modifiers={rowValueAccessibility(props)}
        />
      )}
    </>
  );
}

interface ValueTextProps {
  value: string;
  modifiers: Modifiers;
}

function RowValueText({ value, modifiers }: ValueTextProps): React.JSX.Element {
  const text = useRowText('body', 'secondary');

  if (!ios) return <AndroidValueText value={value} modifiers={modifiers} />;

  return (
    <Text {...text} modifiers={[...(text.modifiers ?? []), ...modifiers]}>
      {value}
    </Text>
  );
}

// Android keeps the value to one line at the row's end, as the title takes the width.
function AndroidValueText({
  value,
  modifiers,
}: ValueTextProps): React.JSX.Element {
  const text = useRowText('body', 'secondary');

  return (
    <Text
      textStyle={{ ...text.textStyle, textAlign: 'right' }}
      modifiers={modifiers}
      numberOfLines={1}
    >
      {value}
    </Text>
  );
}

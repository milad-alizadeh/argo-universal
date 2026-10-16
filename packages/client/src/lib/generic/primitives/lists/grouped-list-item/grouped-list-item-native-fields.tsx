import { type RowProps, Row } from '@expo/ui';
import { fixedSize } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { NativeText } from '#primitives/display/native-text';
import {
  rowValueAccessibility,
  type RowTextAccessibilityProps,
} from './grouped-list-item-accessibility';
import type { ResolvedItemProps } from './grouped-list-item-props';
import { rowColor } from './grouped-list-item-text';
import { NativeRowImage } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

const trailingSpacing = 8;

const trailingModifiers: Modifiers | undefined = ios
  ? [fixedSize({ horizontal: false, vertical: true })]
  : undefined;

export function RowTrailing(
  props: ResolvedItemProps,
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
  Pick<ResolvedItemProps, 'value' | 'valueLeading'>;

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

// Android keeps the value to one line at the row's end, as the title takes the width.
function RowValueText({ value, modifiers }: ValueTextProps): React.JSX.Element {
  return (
    <NativeText
      numberOfLines={ios ? undefined : 1}
      tone="muted"
      modifiers={[...rowColor('secondary'), ...modifiers]}
    >
      {value}
    </NativeText>
  );
}

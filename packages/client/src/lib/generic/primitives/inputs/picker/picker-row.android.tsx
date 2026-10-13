import { Column, Shape, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useNativeTheme } from '../../../native-theme';
import { errorMessage } from '../../fields/field-errors';
import { useInListItem } from '../../lists/list-item/list-item-accessory';
import { useComposeTextStyle } from '../../native/native-typography';
import type { PickerProps } from './picker-props';
import { pickerLabel, pickerValue } from './picker-selection';

const rowHeight = 72;
const accessoryHeight = 48;
const rowInset = 16;
const rowRadius = 10;
const rowPadding = 12;
type RowProps<Value extends string> = PickerProps<Value> & {
  onPress: () => void;
};

export function AndroidPickerRow<Value extends string>(
  props: RowProps<Value>,
): React.JSX.Element {
  return createElement(
    Surface,
    useSurfaceProps(props),
    <PickerRowContent {...props} />,
  );
}

function PickerRowContent<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const inListItem = useInListItem();
  const row = inListItem || props.appearance === 'row';
  return createElement(
    Row,
    { verticalAlignment: 'center', modifiers: rowModifiers(row) },
    <PickerRowLabels {...props} accessory={row} />,
  );
}

function PickerRowLabels<Value extends string>(
  props: PickerProps<Value> & { accessory: boolean },
): React.JSX.Element {
  return createElement(
    Column,
    { modifiers: [weight(1)], verticalArrangement: { spacedBy: 4 } },
    !props.accessory && <PickerRowLabel {...props} />,
    <PickerRowValue {...props} />,
  );
}

function rowModifiers(accessory: boolean): ReturnType<typeof padding>[] {
  return [
    fillMaxWidth(),
    defaultMinSize({ minHeight: accessory ? accessoryHeight : rowHeight }),
    padding(rowInset, rowPadding, rowInset, rowPadding),
  ];
}

function rowDescription<Value extends string>(
  props: PickerProps<Value>,
): string {
  return [
    props.label,
    pickerValue(props),
    errorMessage(props.errors ?? []),
    props.hint,
  ]
    .filter(Boolean)
    .join('. ');
}

type LabelProps = Pick<
  PickerProps<string>,
  'label' | 'required' | 'disabled' | 'invalid'
>;

function PickerRowLabel(props: LabelProps): React.JSX.Element {
  const { colors } = useNativeTheme();
  const style = useComposeTextStyle('body');
  return createElement(
    Text,
    {
      style,
      color: props.disabled ? colors.disabledContent : colors.foreground,
    },
    pickerLabel(props),
  );
}

function PickerRowValue<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const { colors } = useNativeTheme();
  const style = useComposeTextStyle(props.code ? 'code' : 'secondary');
  return createElement(
    Text,
    { style, color: rowValueColor(props, colors) },
    pickerValue(props),
  );
}

function rowValueColor(
  props: Pick<PickerProps<string>, 'disabled' | 'invalid'>,
  colors: ReturnType<typeof useNativeTheme>['colors'],
): string | undefined {
  if (props.disabled) return colors.disabledContent;
  return props.invalid ? colors.destructive : colors.mutedForeground;
}

function rowShape(): NonNullable<
  React.ComponentProps<typeof Surface>['shape']
> {
  return Shape.RoundedCorner({
    cornerRadii: {
      topStart: rowRadius,
      topEnd: rowRadius,
      bottomStart: rowRadius,
      bottomEnd: rowRadius,
    },
  });
}

function useSurfaceProps<Value extends string>(
  props: RowProps<Value>,
): React.ComponentProps<typeof Surface> {
  const { colors } = useNativeTheme();
  return {
    enabled: !props.disabled,
    onClick: props.onPress,
    color: colors.muted,
    shape: rowShape(),
    modifiers: [semantics({ contentDescription: rowDescription(props) })],
  };
}

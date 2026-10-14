import { Column, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { errorMessage } from '#primitives/fields/field-errors';
import { useInGroupedListItem } from '#primitives/lists/grouped-list-item';
import { roundedOutline } from '#primitives/native/native-modifiers';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
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
  const inGroupedListItem = useInGroupedListItem();
  const row = inGroupedListItem || props.appearance === 'row';

  return createElement(
    Row,
    {
      verticalAlignment: 'center',
      modifiers: rowModifiers(row, inGroupedListItem),
    },
    <PickerRowLabels {...props} accessory={row} hug={inGroupedListItem} />,
  );
}

function PickerRowLabels<Value extends string>(
  props: PickerProps<Value> & { accessory: boolean; hug: boolean },
): React.JSX.Element {
  return createElement(
    Column,
    {
      modifiers: props.hug ? [] : [weight(1)],
      verticalArrangement: { spacedBy: 4 },
    },
    !props.accessory && <PickerRowLabel {...props} />,
    <PickerRowValue {...props} />,
  );
}

// A field row spans its form; in a GroupedListItem's trailing slot it hugs its value, as its Host does.
function rowModifiers(
  accessory: boolean,
  hug: boolean,
): ReturnType<typeof padding>[] {
  return [
    ...(hug ? [] : [fillMaxWidth()]),
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
  const style = useComposeTextStyle('secondary');

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

function useSurfaceProps<Value extends string>(
  props: RowProps<Value>,
): React.ComponentProps<typeof Surface> {
  const { colors } = useNativeTheme();

  return {
    enabled: !props.disabled,
    onClick: props.onPress,
    color: colors.muted,
    shape: roundedOutline(rowRadius),
    modifiers: [semantics({ contentDescription: rowDescription(props) })],
  };
}

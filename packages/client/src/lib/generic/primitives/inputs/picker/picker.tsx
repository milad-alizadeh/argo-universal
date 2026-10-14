import { type ComponentType, createElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  type FieldDescription,
  FieldDescriptionFooter,
  useFieldDescription,
} from '#primitives/fields/field-description';
import { useInGroupedListItem } from '#primitives/lists/grouped-list-item';
import { PickerDrillRow } from './picker-drill-row';
import type { PickerProps } from './picker-props';
import { Select } from './picker-select';
import {
  choosePickerOption,
  pickerLabel,
  pickerOption,
} from './picker-selection';
import { PickerContent, PickerTrigger } from './picker-web-parts';

export function Picker<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  if (props.variant === 'row') return <PickerDrillRow {...props} />;

  return <PickerField {...props} />;
}

function PickerField<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const field = useFieldDescription(props);
  const row = useInGroupedListItem();

  return <PickerFrame {...props} {...field} row={row} />;
}

type FrameProps<Value extends string> = PickerProps<Value> &
  FieldDescription & { row: boolean };

function PickerFrame<Value extends string>(
  props: FrameProps<Value>,
): React.JSX.Element {
  return createElement(
    View,
    { className: 'gap-2' },
    <PickerLabel {...props} />,
    <PickerControl {...props} />,
    <FieldDescriptionFooter {...props} />,
  );
}

function PickerLabel(
  props: Pick<FrameProps<string>, 'row' | 'label' | 'required'>,
): React.JSX.Element | null {
  if (props.row) return null;

  return (
    <Text role="body" aria-hidden>
      {pickerLabel(props)}
    </Text>
  );
}

function PickerControl<Value extends string>(
  props: FrameProps<Value>,
): React.JSX.Element {
  return createElement(
    Select,
    selectProps(props),
    <PickerTrigger {...props} />,
    <PickerContent {...props} />,
  );
}

function selectProps<Value extends string>(
  props: PickerProps<Value>,
): React.ComponentProps<typeof Select> {
  return {
    value: pickerOption(props),
    disabled: props.disabled,
    onValueChange: (next) => choosePickerOption(props, next?.value),
    onOpenChange: (open) => {
      if (!open) props.onBlur?.();
    },
  };
}

Picker satisfies ComponentType<PickerProps<string>>;

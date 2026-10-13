import { createElement } from 'react';
import { View } from 'react-native';
import { Text } from '../../display/text/text';
import { useInListItem } from '../../lists/list-item/list-item-accessory';
import { Select } from '../select/select';
import { type PickerField, PickerFooter, usePickerField } from './picker-field';
import type { PickerProps } from './picker-props';
import {
  choosePickerOption,
  pickerLabel,
  pickerOption,
} from './picker-selection';
import { PickerContent, PickerTrigger } from './picker-web-parts';

export function Picker<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const field = usePickerField(props);
  const inListItem = useInListItem();
  const row = props.appearance === 'row' || inListItem;
  return <PickerFrame {...props} {...field} row={row} />;
}

type FrameProps<Value extends string> = PickerProps<Value> &
  PickerField & { row: boolean };

function PickerFrame<Value extends string>(
  props: FrameProps<Value>,
): React.JSX.Element {
  return createElement(
    View,
    { className: 'gap-2' },
    <PickerLabel {...props} />,
    <PickerControl {...props} />,
    <PickerFooter {...props} />,
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

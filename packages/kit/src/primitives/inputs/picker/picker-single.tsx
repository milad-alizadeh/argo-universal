import { type ComponentType, createElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { requiredLabel } from '../../../required-label';
import type { SinglePickerProps } from './picker-props';
import { Select } from './picker-select';
import { choosePickerOption, pickerOption } from './picker-selection';
import { PickerContent, PickerTrigger } from './picker-web-parts';

export function SinglePicker<Value extends string>(
  props: SinglePickerProps<Value>,
): React.JSX.Element {
  return createElement(
    View,
    { className: 'gap-2' },
    <PickerLabel {...props} />,
    <PickerControl {...props} />,
  );
}

function PickerLabel(
  props: Pick<SinglePickerProps<string>, 'label' | 'required'>,
): React.JSX.Element {
  return (
    <Text role="body" aria-hidden>
      {requiredLabel(props)}
    </Text>
  );
}

function PickerControl<Value extends string>(
  props: SinglePickerProps<Value>,
): React.JSX.Element {
  return (
    <Select {...selectProps(props)}>
      <PickerTrigger {...props} />
      <PickerContent {...props} />
    </Select>
  );
}

function selectProps<Value extends string>(
  props: SinglePickerProps<Value>,
): Omit<React.ComponentProps<typeof Select>, 'children'> {
  return {
    value: pickerOption(props)?.value,
    disabled: props.disabled,
    onValueChange: (next) => choosePickerOption(props, next),
    onOpenChange: (open) => {
      if (!open) props.onBlur?.();
    },
  };
}

SinglePicker satisfies ComponentType<SinglePickerProps<string>>;

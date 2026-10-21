import type { ComponentType } from 'react';
import { MultiplePicker } from './picker-multiple';
import type { PickerProps } from './picker-props';
import { SinglePicker } from './picker-single';

// One Picker: `multiple` picks a list of values, otherwise one.
export function Picker<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return props.multiple ? (
    <MultiplePicker {...props} />
  ) : (
    <SinglePicker {...props} />
  );
}

Picker satisfies ComponentType<PickerProps<string>>;

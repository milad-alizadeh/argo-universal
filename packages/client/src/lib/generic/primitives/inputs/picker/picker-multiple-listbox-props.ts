import type { MultiplePickerProps, PickerOption } from './picker-props';

// The options a search leaves showing; choosing still keeps every value.
export type ListboxProps<Value extends string> = MultiplePickerProps<Value> & {
  shown: readonly PickerOption<Value>[];
};

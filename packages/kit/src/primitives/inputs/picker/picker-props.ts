import type { KitProps } from '../../kit-props';

// Kit-only: the invalid mark and blur handling.
export type PickerProps<Value extends string> = KitProps<'Picker', Value> & {
  invalid?: boolean;
  onBlur?: () => void;
};

export type SinglePickerProps<Value extends string> = Exclude<
  PickerProps<Value>,
  { multiple: true }
>;

export type MultiplePickerProps<Value extends string> = Extract<
  PickerProps<Value>,
  { multiple: true }
>;

export type PickerOption<Value extends string> =
  PickerProps<Value>['options'][number];

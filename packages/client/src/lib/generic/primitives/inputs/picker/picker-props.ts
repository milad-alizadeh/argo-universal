import type { FieldErrors } from '#primitives/fields/field-errors';

export type PickerOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
  supportingText?: string;
};

export type PickerProps<Value extends string> = {
  label: string;
  required?: boolean;
  value?: Value;
  options: readonly PickerOption<Value>[];
  onChange: (value: Value) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  loading?: boolean;
  error?: string;
  appearance?: 'row' | 'field';
  onBlur?: () => void;
};

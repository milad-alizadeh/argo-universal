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
  onValueChange: (value: Value) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Validation errors for the chosen value. */
  errors?: FieldErrors;
  hint?: string;
  loading?: boolean;
  /** Why the options failed to load; shown in place of the option list. */
  loadError?: string;
  variant?: 'row' | 'field';
  onBlur?: () => void;
};

import type { FieldErrors } from '#primitives/fields/field-errors';
import type { KitProps } from '../../kit-props';

// Kit-only: local validation, hint and blur handling.
export type PickerProps<Value extends string> = KitProps<'Picker', Value> & {
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  onBlur?: () => void;
};

export type PickerOption<Value extends string> =
  PickerProps<Value>['options'][number];

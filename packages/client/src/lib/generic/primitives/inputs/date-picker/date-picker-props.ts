import type { FieldErrors } from '#primitives/fields/field-errors';
import type { KitProps } from '../../kit-props';

// Kit-only: local validation, hint and blur handling, as TextInput.
export type DatePickerProps = KitProps<'DatePicker'> & {
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  onBlur?: () => void;
};

export type DatePickerMode = NonNullable<DatePickerProps['mode']>;

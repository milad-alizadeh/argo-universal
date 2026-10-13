import type { FieldErrors } from '../../fields/field-errors';

export interface CheckboxProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  onBlur?: () => void;
}

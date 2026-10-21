import type { FieldErrors } from '#primitives/fields/field-errors';
import type { KitProps } from '../../kit-props';

// Kit-only: local form validation, hints and blur handling.
export type CheckboxProps = KitProps<'Checkbox'> & {
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  onBlur?: () => void;
};

export type CheckboxIndicatorProps = Pick<
  CheckboxProps,
  'value' | 'invalid' | 'disabled' | 'selection' | 'variant'
>;

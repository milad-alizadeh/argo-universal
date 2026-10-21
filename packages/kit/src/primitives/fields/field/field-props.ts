import type { FieldErrors } from '#primitives/fields/field-errors';
import type { KitProps } from '../../kit-props';

// Kit-only: local validation and help text.
export type FieldProps = KitProps<'Field'> & {
  errors?: FieldErrors;
  hint?: string;
};

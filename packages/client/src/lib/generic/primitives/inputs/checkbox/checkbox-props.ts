import type { FieldErrors } from '#primitives/fields/field-errors';
import type { CheckboxState } from './checkbox-state';

export interface CheckboxProps {
  label: string;
  variant?: 'option';
  selection?: 'single' | 'multiple';
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  onBlur?: () => void;
}

export type CheckboxIndicatorProps = Pick<
  CheckboxProps,
  'value' | 'invalid' | 'disabled' | 'selection' | 'variant'
>;

export type CheckboxRowProps = CheckboxProps & { state: CheckboxState };

import type { FieldErrors } from '#primitives/fields/field-errors';

export interface CheckboxProps {
  label: string;
  appearance?: 'option';
  selection?: 'single' | 'multiple';
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  errors?: FieldErrors;
  hint?: string;
  onBlur?: () => void;
}

export type CheckboxIndicatorProps = Pick<
  CheckboxProps,
  'value' | 'invalid' | 'disabled' | 'selection' | 'appearance'
>;

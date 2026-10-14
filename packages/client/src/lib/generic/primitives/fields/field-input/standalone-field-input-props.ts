import type { FieldInputProps } from './field-input-props';

export type StandaloneFieldInputProps = FieldInputProps & {
  required?: boolean;
  numeric?: boolean;
};

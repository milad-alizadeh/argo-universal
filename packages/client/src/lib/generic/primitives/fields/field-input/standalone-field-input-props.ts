import type { FieldInputProps } from '../field-props';

export type StandaloneFieldInputProps = FieldInputProps & {
  required?: boolean;
  numeric?: boolean;
};

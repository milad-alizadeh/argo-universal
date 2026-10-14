import type { ReactNode } from 'react';
import type { FieldErrors } from '#primitives/fields/field-errors';

export type StandaloneFieldProps = {
  errors?: FieldErrors;
  hint?: string;
  children: ReactNode;
};

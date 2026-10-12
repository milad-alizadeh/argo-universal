import type * as React from 'react';
import type { ReactNode } from 'react';
import { Input } from '#lib/generic/primitives/input';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import type { FieldSectionProps } from '../../../lib/generic/primitives/field-props';

export type FieldErrors = readonly unknown[];
export type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  errors?: FieldErrors;
  mono?: boolean;
  disabled?: boolean;
  className?: string;
};

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const objectMessage = (error: unknown): string | undefined =>
  error instanceof Object && 'message' in error
    ? textOf(error.message)
    : undefined;

// Standard Schema issues and plain strings both carry the message the person reads.
export const errorMessage = (errors: FieldErrors): string | undefined => {
  const [error] = errors;
  return typeof error === 'string' ? error : objectMessage(error);
};

// A section's footer: an error in the destructive tone in place of the hint.
export const sectionFooter = (
  error: string | undefined,
  hint?: string,
): Pick<FieldSectionProps, 'footer' | 'footerTone'> =>
  error === undefined
    ? { footer: hint }
    : { footer: error, footerTone: 'destructive' };

const hasErrors = (errors: FieldErrors = []): boolean => errors.length > 0;
const inputClass = ({ mono, className }: FormInputProps): string =>
  cn(mono ? 'type-code' : 'type-body', className);

export function FormInput(props: FormInputProps): React.JSX.Element {
  return (
    <Input
      accessibilityLabel={props.label}
      aria-invalid={hasErrors(props.errors)}
      className={inputClass(props)}
      value={props.value}
      placeholder={props.placeholder}
      onChangeText={props.onChange}
      onBlur={props.onBlur}
      editable={!props.disabled}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

// What is wrong with an entry, under its input.
export function FieldMessage({
  errors,
}: {
  errors: FieldErrors;
}): React.JSX.Element | null {
  const error = errorMessage(errors);
  if (!error) return null;
  return (
    <Text role="secondary" className="text-destructive" semanticRole="alert">
      {error}
    </Text>
  );
}

export function FormLabel({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <Text role="body">{children}</Text>;
}

// The part of a TanStack Form field that a text input reads.
export type TextField = {
  state: { value: string; meta: { isTouched: boolean; errors: FieldErrors } };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};
type BoundInput = Pick<FormInputProps, 'value' | 'onChange' | 'onBlur'> &
  Required<Pick<FormInputProps, 'errors'>>;

const fieldInput = (field: TextField): BoundInput => ({
  value: field.state.value,
  onChange: field.handleChange,
  onBlur: field.handleBlur,
  errors: field.state.meta.errors,
});

// Errors show once the person has left the field.
export const touchedInput = (field: TextField): BoundInput => ({
  ...fieldInput(field),
  errors: field.state.meta.isTouched ? field.state.meta.errors : [],
});

import type * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';
import {
  type FieldErrors,
  errorMessage,
} from '#primitives/fields/field-errors';
import { TextInput } from '#primitives/inputs/text-input';
import type { GroupedListSectionProps } from '#primitives/lists/grouped-list-section';

export type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  errors?: FieldErrors;
  mono?: boolean;
  disabled?: boolean;
  className?: string;
};

// A section's footer: an error in the destructive tone in place of the hint.
export const sectionFooter = (
  error: string | undefined,
  hint?: string,
): Pick<GroupedListSectionProps, 'footer' | 'footerTone'> =>
  error === undefined
    ? { footer: hint }
    : { footer: error, footerTone: 'destructive' };

const hasErrors = (errors: FieldErrors = []): boolean => errors.length > 0;

const inputClass = ({ mono, className }: FormInputProps): string =>
  cn(mono ? 'type-code' : 'type-body', className);

// The bare box; names, paths and values are typed exactly as the Agent reads them.
const verbatimEntry = {
  appearance: 'bare',
  autoCapitalize: 'none',
  autoCorrect: false,
} as const;

export function FormInput(props: FormInputProps): React.JSX.Element {
  return (
    <TextInput
      accessibilityLabel={props.label}
      aria-invalid={hasErrors(props.errors)}
      className={inputClass(props)}
      value={props.value}
      placeholder={props.placeholder}
      onChangeText={props.onChangeText}
      onBlur={props.onBlur}
      editable={!props.disabled}
      {...verbatimEntry}
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
    <Text role="secondary" className="text-danger" semanticRole="alert">
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

type BoundInput = Pick<FormInputProps, 'value' | 'onChangeText' | 'onBlur'> &
  Required<Pick<FormInputProps, 'errors'>>;

const fieldInput = (field: TextField): BoundInput => ({
  value: field.state.value,
  onChangeText: field.handleChange,
  onBlur: field.handleBlur,
  errors: field.state.meta.errors,
});

// Errors show once the person has left the field.
export const touchedInput = (field: TextField): BoundInput => ({
  ...fieldInput(field),
  errors: field.state.meta.isTouched ? field.state.meta.errors : [],
});

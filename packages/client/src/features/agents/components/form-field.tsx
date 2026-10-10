import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Input } from '#lib/generic/primitives/input';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';

export type FieldErrors = readonly unknown[];
type FieldMessageProps = { hint?: string; errors: FieldErrors };
export type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
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
      onChangeText={props.onChange}
      onBlur={props.onBlur}
      editable={!props.disabled}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

export function FieldMessage({
  hint,
  errors,
}: FieldMessageProps): React.JSX.Element | null {
  const error = errorMessage(errors);
  const message = error ?? hint;
  if (!message) return null;
  return <MessageText message={message} isError={error !== undefined} />;
}

function MessageText(props: {
  message: string;
  isError: boolean;
}): React.JSX.Element {
  return (
    <Text
      className={cn('type-secondary', props.isError && 'text-destructive')}
      role={props.isError ? 'alert' : undefined}
    >
      {props.message}
    </Text>
  );
}

export function FormLabel({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <Text className="type-body">{children}</Text>;
}

export function LabelledInput(
  props: FormInputProps & { hint?: string },
): React.JSX.Element {
  return (
    <View className="gap-2 pt-4">
      <FormLabel>{props.label}</FormLabel>
      <FormInput {...props} />
      <FieldMessage hint={props.hint} errors={props.errors ?? []} />
    </View>
  );
}

// The part of a TanStack Form field that a text input reads.
export type TextField = {
  state: { value: string; meta: { isTouched: boolean; errors: FieldErrors } };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};
type BoundInput = Pick<FormInputProps, 'value' | 'onChange' | 'onBlur'> &
  Required<Pick<FormInputProps, 'errors'>>;

export const fieldInput = (field: TextField): BoundInput => ({
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

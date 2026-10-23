import type { ReactElement } from 'react';
import { TextInput } from 'react-native';
import { cn } from '#kit/utils';
import type { FieldTextProps } from './field-text-props';

/*
 * The web row's bare input: no border, fill, shadow or inset, at the row's own height, its text leading-aligned.
 * Private to the row. A multiline one is a textarea that grows with its text.
 */
export function FieldTextInput(props: FieldTextProps): ReactElement {
  return <TextInput className={inputClass(props)} {...inputProps(props)} />;
}

const inputProps = (
  props: FieldTextProps,
): React.ComponentProps<typeof TextInput> & { 'aria-invalid'?: boolean } => ({
  ...valueProps(props),
  ...focusProps(props),
  onChangeText: props.onChangeText,
  onFocus: props.onFocus,
  onBlur: props.onBlur,
  onSubmitEditing: () => props.onSubmit?.(),
});

const valueProps = (
  props: FieldTextProps,
): React.ComponentProps<typeof TextInput> & { 'aria-invalid'?: boolean } => ({
  value: props.value,
  accessibilityLabel: props.title,
  'aria-invalid': props.error !== undefined,
  placeholder: props.placeholder,
  editable: !props.disabled,
  secureTextEntry: props.secure,
  keyboardType: props.keyboardType,
  multiline: props.multiline,
});

// Web's TextInput focuses on mount and selects its text on focus.
const focusProps = (
  props: FieldTextProps,
): Pick<
  React.ComponentProps<typeof TextInput>,
  'autoFocus' | 'selectTextOnFocus'
> => ({
  autoFocus: props.autoFocus,
  selectTextOnFocus: props.selectTextOnFocus,
});

const base =
  'min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground type-body native:placeholder:text-muted-foreground/50 web:outline-none web:placeholder:text-muted-foreground';

const disabledClass = 'opacity-50 web:cursor-not-allowed';

const multilineClass = 'web:field-sizing-content web:resize-none';

const inputClass = (props: FieldTextProps): string =>
  cn(base, props.disabled && disabledClass, props.multiline && multilineClass);

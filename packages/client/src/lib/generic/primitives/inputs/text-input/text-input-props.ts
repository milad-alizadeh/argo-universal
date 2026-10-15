import type { RefAttributes } from 'react';
import type {
  TextInput as NativeTextInput,
  TextInputProps as NativeTextInputProps,
} from 'react-native';
import type { FieldErrors } from '#primitives/fields/field-errors';

// A labelled text field; on iOS and the web its hint and its error sit in a footer, on Android under the field.
export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  // An example value shown while the field is empty, so it reads as a place to type.
  placeholder?: string;
  // Any error marks the field invalid; the footer, or Android's line under the field, says what is wrong.
  errors?: FieldErrors;
  // What to type, under the field on Android while it has no error; iOS and the web say it in the footer.
  hint?: string;
  // Code, such as a path or a command, draws in the mono face.
  mono?: boolean;
  disabled?: boolean;
  // The value is being checked, such as a path being resolved: a spinner trails the field.
  loading?: boolean;
}

// What the field's spinner says while it checks the value.
export const fieldLoadingLabel = (label: string): string => `Checking ${label}`;

// A row inside a GroupedListSection: the label leading, the field taking the rest of the row.
export type RowTextInputProps = TextFieldProps & { variant: 'row' };

// A field on its own, outside a GroupedListSection, with its label above it and its footer under it.
export type StandaloneTextInputProps = TextFieldProps & {
  variant?: 'standalone';
  required?: boolean;
  numeric?: boolean;
};

// The bare box with no label or footer, for a caller that lays out its own label.
export type BareTextInputProps = NativeTextInputProps &
  RefAttributes<NativeTextInput> & {
    variant: 'bare';
    // `muted` is the compact borderless box inside a popover, such as the link editor's.
    tone?: 'neutral' | 'muted';
    // React Native has no invalid state of its own, so the box draws it from this on every platform.
    'aria-invalid'?: boolean;
  };

export type TextInputProps =
  | StandaloneTextInputProps
  | RowTextInputProps
  | BareTextInputProps;

// A phone field, on its own or as a row. Android says its error or hint as the field's supporting text; iOS says it in the footer.
export type PhoneFieldProps = TextFieldProps &
  Pick<StandaloneTextInputProps, 'required' | 'numeric'>;

export const isInvalid = (props: Pick<TextFieldProps, 'errors'>): boolean =>
  (props.errors?.length ?? 0) > 0;

export const requiredLabel = (
  props: Pick<PhoneFieldProps, 'label' | 'required'>,
): string => (props.required ? `${props.label} *` : props.label);

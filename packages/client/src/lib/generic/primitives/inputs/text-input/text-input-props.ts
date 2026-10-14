import type { RefAttributes } from 'react';
import type {
  TextInput as NativeTextInput,
  TextInputProps as NativeTextInputProps,
} from 'react-native';
import type { FieldErrors } from '#primitives/fields/field-errors';

// A labelled text field; on iOS and the web its hint and its error sit in a footer.
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
}

// A row inside a GroupedListSection: the label leading, the field taking the rest of the row.
export type RowTextInputProps = TextFieldProps & { appearance: 'row' };

// A field on its own, outside a GroupedListSection, with its label above it and its footer under it.
export type StandaloneTextInputProps = TextFieldProps & {
  appearance?: 'standalone';
  required?: boolean;
  numeric?: boolean;
};

// The bare box with no label or footer, for a caller that lays out its own label.
export type BareTextInputProps = NativeTextInputProps &
  RefAttributes<NativeTextInput> & {
    appearance: 'bare';
    // `muted` is the compact borderless box inside a popover, such as the link editor's.
    variant?: 'default' | 'muted';
  };

export type TextInputProps =
  | StandaloneTextInputProps
  | RowTextInputProps
  | BareTextInputProps;

export const isInvalid = (props: Pick<TextFieldProps, 'errors'>): boolean =>
  (props.errors?.length ?? 0) > 0;

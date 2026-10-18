import type { RefAttributes } from 'react';
import type {
  TextInput as NativeTextInput,
  TextInputProps as NativeTextInputProps,
} from 'react-native';
import {
  errorMessage,
  type FieldErrors,
} from '#primitives/fields/field-errors';
import type { KitProps } from '../../kit-props';

/*
 * A labelled text field; on iOS and the web its hint and its error sit in a footer.
 * Kit-only: local validation, hint and blur handling.
 */
export type TextFieldProps = KitProps<'TextInput'> & {
  onBlur?: () => void;
  errors?: FieldErrors;
  hint?: string;
};

// What a field's spinner needs: the field's label to speak, and whether it checks the value now.
export type FieldProgressProps = Pick<TextFieldProps, 'label' | 'loading'>;

// What the field's spinner says while it checks the value.
export const fieldLoadingLabel = (label: string): string => `Checking ${label}`;

// What either labelled variant may ask of its entry: a starred label, a numeric keyboard, masked entry for a secret.
type EntryProps = Pick<TextFieldProps, 'required' | 'numeric' | 'secure'>;

/*
 * A field may draw no label, its placeholder or the heading above saying what to type, as a
 * free-entry field such as "Something else…" does; the label still names the field for assistive
 * technology. Android's stacked field then keeps its plain outline.
 */
type RowEntryProps = Pick<TextFieldProps, 'labelHidden'>;

// A row inside a List.Section: the label leading, the field taking the rest of the row.
export type RowTextInputProps = TextFieldProps &
  EntryProps &
  RowEntryProps & { variant: 'row' };

// A field on its own, outside a List.Section, with its label above it and its footer under it.
export type StandaloneTextInputProps = TextFieldProps &
  EntryProps &
  RowEntryProps & { variant?: 'standalone' };

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

export type PhoneFieldProps = TextFieldProps & EntryProps & RowEntryProps;

// Invalid only when there is a message to show: a form may pass an empty entry while nothing has failed.
export const isInvalid = (props: Pick<TextFieldProps, 'errors'>): boolean =>
  errorMessage(props.errors ?? []) !== undefined;

// The web keyboard an entry asks for: numeric, or masked for a secret.
export const keyboardOf = ({
  numeric,
  secure,
}: EntryProps): Pick<
  NativeTextInputProps,
  'keyboardType' | 'secureTextEntry'
> => ({
  keyboardType: numeric ? 'numbers-and-punctuation' : 'default',
  secureTextEntry: secure,
});

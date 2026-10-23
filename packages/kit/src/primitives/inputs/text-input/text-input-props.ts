import type { RefAttributes } from 'react';
import type {
  TextInputInstance,
  TextInputProps as NativeTextInputProps,
} from 'react-native';
import type { KitProps } from '../../kit-props';

// A labelled text field. Kit-only: local validation, focus and blur handling.
export type TextFieldProps = KitProps<'TextInput'> & {
  invalid?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
};

// What a field's spinner needs: the field's label to speak, and whether it checks the value now.
export type FieldProgressProps = Pick<TextFieldProps, 'label' | 'loading'>;

// What the field's spinner says while it checks the value.
export const fieldLoadingLabel = (label: string): string => `Checking ${label}`;

// What a labelled field may ask of its entry: a starred label, a numeric keyboard, masked entry for a secret.
type EntryProps = Pick<TextFieldProps, 'required' | 'numeric' | 'secure'>;

/*
 * A field may draw no label, its placeholder or the heading above saying what to type, as a
 * free-entry field such as "Something else…" does; the label still names the field for assistive
 * technology. Android's stacked field then keeps its plain outline.
 */
type RowEntryProps = Pick<TextFieldProps, 'labelHidden'>;

// A field on its own, with its label above it.
export type StandaloneTextInputProps = TextFieldProps &
  EntryProps &
  RowEntryProps & { variant?: 'standalone' };

// The bare box with no label or footer, for a caller that lays out its own label.
export type BareTextInputProps = NativeTextInputProps &
  RefAttributes<TextInputInstance> & {
    variant: 'bare';
    // `muted` is the compact borderless box inside a popover, such as the link editor's.
    tone?: 'neutral' | 'muted';
    // React Native has no invalid state of its own, so the box draws it from this on every platform.
    'aria-invalid'?: boolean;
  };

export type TextInputProps = StandaloneTextInputProps | BareTextInputProps;

export type PhoneFieldProps = TextFieldProps & EntryProps & RowEntryProps;

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

export function focusOf(
  props: TextFieldProps,
): Pick<
  NativeTextInputProps,
  'onFocus' | 'onBlur' | 'autoFocus' | 'selectTextOnFocus'
> {
  return {
    onFocus: props.onFocus,
    onBlur: props.onBlur,
    autoFocus: props.focusOnOpen,
    selectTextOnFocus: props.selectOnFocus,
  };
}

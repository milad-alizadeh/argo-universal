import { frame, textFieldStyle } from '@expo/ui/swift-ui/modifiers';
import type { ComponentType, ReactElement } from 'react';
import { Platform } from 'react-native';
import { Field } from '#primitives/fields/field';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import {
  InlineField,
  type NativeFieldProps,
  StackedField,
} from './text-input-native-parts';
import type { StandaloneTextInputProps } from './text-input-props';
import { StandaloneTextInput as WideStandaloneTextInput } from './text-input-standalone.tsx';

// The field in its own Host, its hint or error in the footer under it.
export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  if (useWide()) return <WideStandaloneTextInput {...props} />;

  return (
    <Field {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <PhoneField {...props} />
      </Host>
    </Field>
  );
}

// iOS: the label leading a bordered field in one row; Android: the label above a filled box.
function PhoneField(props: StandaloneTextInputProps): ReactElement {
  const field = phoneField(props);

  if (Platform.OS === 'ios')
    return <InlineField {...field} rowModifiers={inlineRow} />;

  return <StackedField {...field} />;
}

// iOS draws SwiftUI's stock bordered field; the modifier is ignored on Android.
const phoneField = (props: StandaloneTextInputProps): NativeFieldProps => ({
  ...props,
  modifiers: [textFieldStyle('roundedBorder')],
  label: props.required ? `${props.label} *` : props.label,
  keyboardType: props.numeric ? numericKeyboard : undefined,
});

// Android's universal field maps `numeric` to its decimal keyboard.
const numericKeyboard =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

const inlineRow = [frame({ minHeight: 52, maxWidth: Infinity })];

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;

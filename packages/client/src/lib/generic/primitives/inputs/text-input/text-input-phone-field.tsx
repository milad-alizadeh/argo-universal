import { Row, TextInput, type TextInputProps, useNativeState } from '@expo/ui';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { codeFace, NativeText } from '#primitives/display/native-text';
import { useFieldText } from './text-input-field-text';
import {
  isInvalid,
  type PhoneFieldProps,
  requiredLabel,
} from './text-input-props';

/*
 * iOS: a Settings form row, the label leading and the universal field taking the rest
 * of the row with its text trailing. The hint or error sits in the footer under it.
 */
export function PhoneField(props: PhoneFieldProps): React.JSX.Element {
  const label = requiredLabel(props);

  return (
    <Row alignment="center">
      <NativeText tone={isInvalid(props) ? 'danger' : undefined}>
        {label}
      </NativeText>
      <NativeTextField {...props} label={label} />
    </Row>
  );
}

function NativeTextField(props: PhoneFieldProps): React.JSX.Element {
  const text = useNativeState(props.value);
  const { onChangeText, onFocusChanged } = useFieldText(text, props);

  return (
    <TextInput
      value={text}
      onChangeText={onChangeText}
      onFocus={() => onFocusChanged(true)}
      onBlur={() => onFocusChanged(false)}
      {...fieldBehaviour(props)}
    />
  );
}

function fieldBehaviour(props: PhoneFieldProps): TextInputProps {
  const code = codeFace(props.mono);

  return {
    textStyle: code.textStyle,
    modifiers: [...code.modifiers, accessibilityLabel(props.label)],
    placeholder: props.placeholder,
    editable: !props.disabled,
    autoCapitalize: 'none',
    autoCorrect: false,
    keyboardType: props.numeric ? 'numbers-and-punctuation' : undefined,
    textAlign: 'right',
  };
}

PhoneField satisfies React.ComponentType<PhoneFieldProps>;

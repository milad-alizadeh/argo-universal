import { Row, TextInput, type TextInputProps, useNativeState } from '@expo/ui';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { KeyboardController } from 'react-native-keyboard-controller';
import { codeFace, NativeText } from '#primitives/content/native-text';
import { Field } from '#primitives/fields/field';
import { useFieldText } from './text-input-field-text';
import { requiredLabel } from './text-input-label';
import { FieldProgress } from './text-input-progress';
import { isInvalid, type PhoneFieldProps } from './text-input-props';

export function PhoneField(props: PhoneFieldProps): React.JSX.Element {
  const label = requiredLabel(props);

  return (
    <Row alignment="center">
      {!props.labelHidden && (
        <NativeText tone={isInvalid(props) ? 'danger' : undefined}>
          {label}
        </NativeText>
      )}
      <NativeTextField {...props} label={label} />
      <FieldProgress label={props.label} loading={props.loading} />
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
    secureTextEntry: props.secure,
    // Beside a label the value trails the row; alone, the entry leads it as the row's title would.
    textAlign: props.labelHidden ? 'left' : 'right',
    ...entryBehaviour(props),
  };
}

// Focus as the field appears, and a field that submits its form shows Done on the keyboard's return key.
function entryBehaviour(props: PhoneFieldProps): TextInputProps {
  const focus = {
    autoFocus: props.focusOnOpen,
    selectTextOnFocus: props.selectOnFocus,
  };

  const submit = props.onSubmit;

  if (!submit)
    return {
      ...focus,
      onSubmitEditing: () => KeyboardController.setFocusTo('next'),
      returnKeyType: 'next',
    };

  return { ...focus, onSubmitEditing: () => submit(), returnKeyType: 'done' };
}

export const PhoneFieldWithFooter = Field;

PhoneField satisfies React.ComponentType<PhoneFieldProps>;

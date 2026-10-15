import {
  Column,
  Row,
  Text,
  TextInput,
  type TextInputProps as UniversalTextInputProps,
  useNativeState,
} from '@expo/ui';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useFollowedText } from '#primitives/native/followed-text';
import { useNativeTextExceptions } from '#primitives/native/native-typography';
import { blurOnFocusLoss } from './focus-loss';
import { isInvalid, type TextFieldProps } from './text-input-props';

type Modifiers = NonNullable<UniversalTextInputProps['modifiers']>;

type FieldBox = Pick<
  UniversalTextInputProps,
  'modifiers' | 'textAlign' | 'keyboardType'
>;

export type NativeFieldProps = TextFieldProps & FieldBox;

// Invalid labels and supporting text retain the approved danger colour.
function FieldText(props: {
  danger?: boolean;
  children: string;
}): React.JSX.Element {
  const appearance = useNativeTextExceptions({ danger: props.danger });

  return <Text {...appearance}>{props.children}</Text>;
}

// iOS: the label leading, the field taking the rest of the row with its text trailing.
export function InlineField(props: NativeFieldProps): React.JSX.Element {
  return (
    <Row alignment="center">
      <FieldText danger={isInvalid(props)}>{props.label}</FieldText>
      <NativeTextField {...props} textAlign="right" />
    </Row>
  );
}

// Android: the label above the universal bare field, then its error or hint.
export function StackedField({
  line,
  ...props
}: NativeFieldProps & { line?: string }): React.JSX.Element {
  return (
    <Column modifiers={[fillMaxWidth()]}>
      <FieldText danger={isInvalid(props)}>{props.label}</FieldText>
      <NativeTextField {...props} modifiers={[fillMaxWidth()]} />
      <SupportingLine line={line} danger={isInvalid(props)} />
    </Column>
  );
}

function SupportingLine(props: {
  line?: string;
  danger: boolean;
}): React.JSX.Element | null {
  if (!props.line) return null;

  return <FieldText danger={props.danger}>{props.line}</FieldText>;
}

// The universal text field, following the form's value and blurring only once the person has left it.
function NativeTextField(props: NativeFieldProps): React.JSX.Element {
  const text = useNativeTextExceptions({ code: props.mono });

  return (
    <TextInput
      {...useFieldValue(props)}
      {...fieldBehaviour(props)}
      textStyle={text.textStyle}
      modifiers={[...fieldModifiers(props), ...(text.modifiers ?? [])]}
    />
  );
}

type FieldValue = Pick<
  UniversalTextInputProps,
  'value' | 'onChangeText' | 'onFocus' | 'onBlur'
>;

function useFieldValue({
  onBlur = () => {},
  ...props
}: NativeFieldProps): FieldValue {
  const text = useNativeState(props.value);
  const onChangeText = useFollowedText(text, props.value, props.onChangeText);
  const [focus] = useState(blurOnFocusLoss);

  return {
    value: text,
    onChangeText,
    onFocus: () => focus(true, onBlur),
    onBlur: () => focus(false, onBlur),
  };
}

function fieldBehaviour(props: NativeFieldProps): UniversalTextInputProps {
  return {
    placeholder: props.placeholder,
    editable: !props.disabled,
    autoCapitalize: 'none',
    autoCorrect: false,
    keyboardType: props.keyboardType,
    textAlign: props.textAlign,
  };
}

// Universal TextInput has no label prop, so name its actual editable control on both phones.
function fieldModifiers(props: NativeFieldProps): Modifiers {
  const modifiers = props.modifiers ?? [];

  return Platform.OS === 'android'
    ? [...modifiers, semantics({ contentDescription: props.label })]
    : [...modifiers, accessibilityLabel(props.label)];
}

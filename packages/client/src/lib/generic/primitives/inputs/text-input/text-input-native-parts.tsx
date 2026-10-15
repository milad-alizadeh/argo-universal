import {
  Column,
  Row,
  Text,
  TextInput,
  type TextInputProps as UniversalTextInputProps,
  useNativeState,
} from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel, font } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useFollowedText } from '#primitives/native/followed-text';
import { useNativeTheme } from '../../../native-theme';
import { blurOnFocusLoss } from './focus-loss';
import { isInvalid, type TextFieldProps } from './text-input-props';

type Modifiers = NonNullable<UniversalTextInputProps['modifiers']>;

type FieldBox = Pick<UniversalTextInputProps, 'textAlign' | 'keyboardType'>;

export type NativeFieldProps = TextFieldProps & FieldBox;

// Text in the platform's own style; danger is the one colour a native field takes from the theme, for an invalid field.
function FieldText(props: {
  danger?: boolean;
  children: string;
}): React.JSX.Element {
  const { danger } = useNativeTheme().colors;

  return (
    <Text textStyle={props.danger === true ? { color: danger } : undefined}>
      {props.children}
    </Text>
  );
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

// Android: the label above the universal bare field, then the error or hint when there is one.
export function StackedField({
  line,
  ...props
}: NativeFieldProps & { line?: string }): React.JSX.Element {
  return (
    <Column spacing={4} modifiers={[fillMaxWidth()]}>
      <FieldText danger={isInvalid(props)}>{props.label}</FieldText>
      <NativeTextField {...props} />
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
  const code = codeText(props.mono);

  return (
    <TextInput
      {...useFieldValue(props)}
      {...fieldBehaviour(props)}
      textStyle={code.textStyle}
      modifiers={[...fieldWidth, ...code.modifiers, ...namedField(props.label)]}
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

type CodeText = Pick<UniversalTextInputProps, 'textStyle'> & {
  modifiers: Modifiers;
};

// Code asks only for the mono face, at the platform's own body size: SwiftUI takes it as a font modifier, Compose as a font family.
function codeText(mono: boolean | undefined): CodeText {
  if (mono !== true) return { modifiers: [] };

  return Platform.OS === 'ios'
    ? { modifiers: [font({ textStyle: 'body', design: 'monospaced' })] }
    : { textStyle: { fontFamily: 'monospace' }, modifiers: [] };
}

// Compose's bare field takes the column's width; SwiftUI's fills its row already.
const fieldWidth: Modifiers = Platform.OS === 'android' ? [fillMaxWidth()] : [];

// SwiftUI's field is named after its label. Universal TextInput cannot name the Compose field, so TalkBack reads the label only as the text beside it.
const namedField = (label: string): Modifiers =>
  Platform.OS === 'ios' ? [accessibilityLabel(label)] : [];

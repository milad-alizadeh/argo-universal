import {
  Column,
  Row,
  TextInput,
  type TextInputProps as UniversalTextInputProps,
  useNativeState,
} from '@expo/ui';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Platform } from 'react-native';
import { codeFace, NativeText } from '#primitives/display/native-text';
import type { Tone } from '#primitives/display/text';
import { useFollowedText } from '#primitives/native/followed-text';
import { blurOnFocusLoss } from './focus-loss';
import { FieldProgress } from './text-input-progress';
import { isInvalid, type TextFieldProps } from './text-input-props';

type Modifiers = NonNullable<UniversalTextInputProps['modifiers']>;

type FieldBox = Pick<UniversalTextInputProps, 'textAlign' | 'keyboardType'>;

export type NativeFieldProps = TextFieldProps & FieldBox;

// An invalid field's label and supporting line read in danger.
const invalidTone = (props: NativeFieldProps): Tone | undefined =>
  isInvalid(props) ? 'danger' : undefined;

// iOS: the label leading, the field taking the rest of the row with its text trailing.
export function InlineField(props: NativeFieldProps): React.JSX.Element {
  return (
    <Row alignment="center">
      <NativeText tone={invalidTone(props)}>{props.label}</NativeText>
      <NativeTextField {...props} textAlign="right" />
      <FieldProgress label={props.label} loading={props.loading} />
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
      <NativeText tone={invalidTone(props)}>{props.label}</NativeText>
      <FieldWithProgress {...props} />
      <SupportingLine line={line} tone={invalidTone(props)} />
    </Column>
  );
}

// While the value is checked, the field shares its row with the spinner at the end.
function FieldWithProgress(props: NativeFieldProps): React.JSX.Element {
  if (!props.loading) return <NativeTextField {...props} />;

  return (
    <Row alignment="center" spacing={8} modifiers={[fillMaxWidth()]}>
      <NativeTextField {...props} width={[weight(1)]} />
      <FieldProgress label={props.label} loading />
    </Row>
  );
}

function SupportingLine(props: {
  line?: string;
  tone?: Tone;
}): React.JSX.Element | null {
  if (!props.line) return null;

  return (
    <NativeText role="secondary" tone={props.tone}>
      {props.line}
    </NativeText>
  );
}

// The universal text field, following the form's value and blurring only once the person has left it.
function NativeTextField({
  width = fieldWidth,
  ...props
}: NativeFieldProps & { width?: Modifiers }): React.JSX.Element {
  const code = codeFace(props.mono);

  return (
    <TextInput
      {...useFieldValue(props)}
      {...fieldBehaviour(props)}
      textStyle={code.textStyle}
      modifiers={[...width, ...code.modifiers, ...namedField(props.label)]}
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

// Compose's bare field takes the column's width; SwiftUI's fills its row already.
const fieldWidth: Modifiers = Platform.OS === 'android' ? [fillMaxWidth()] : [];

// SwiftUI's field is named after its label. Universal TextInput cannot name the Compose field, so TalkBack reads the label only as the text beside it.
const namedField = (label: string): Modifiers =>
  Platform.OS === 'ios' ? [accessibilityLabel(label)] : [];

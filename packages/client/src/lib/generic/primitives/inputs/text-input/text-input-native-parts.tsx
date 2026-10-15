import {
  Column,
  Row,
  Text,
  TextInput,
  type TextInputProps as UniversalTextInputProps,
  type UniversalTextStyle,
  useNativeState,
} from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { TextRole } from '#primitives/display/text';
import { useFollowedText } from '#primitives/native/followed-text';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { blurOnFocusLoss } from './focus-loss';
import { isInvalid, type TextFieldProps } from './text-input-props';

const inset = 16;

type Modifiers = NonNullable<UniversalTextInputProps['modifiers']>;

type FieldBox = Pick<
  UniversalTextInputProps,
  'style' | 'modifiers' | 'textAlign' | 'keyboardType'
>;

export type NativeFieldProps = TextFieldProps & FieldBox;

// A line of text in a type role; danger is the one colour a native field takes from the theme, for an invalid field.
function FieldText(props: {
  role: TextRole;
  danger?: boolean;
  children: string;
}): React.JSX.Element {
  return <Text textStyle={useFieldTextStyle(props)}>{props.children}</Text>;
}

function useFieldTextStyle(props: {
  role: TextRole;
  danger?: boolean;
}): UniversalTextStyle {
  const style = useUniversalTextStyle(props.role);
  const { danger } = useNativeTheme().colors;

  return props.danger === true ? { ...style, color: danger } : style;
}

// iOS: the label leading, the field taking the rest of the row with its text trailing.
export function InlineField({
  rowModifiers,
  ...props
}: NativeFieldProps & { rowModifiers: Modifiers }): React.JSX.Element {
  return (
    <Row alignment="center" spacing={inset} modifiers={rowModifiers}>
      <FieldText role="body" danger={isInvalid(props)}>
        {props.label}
      </FieldText>
      <NativeTextField {...props} textAlign="right" />
    </Row>
  );
}

// Android: the label above a filled box, then the error or hint when there is one.
export function StackedField({
  line,
  ...props
}: NativeFieldProps & { line?: string }): React.JSX.Element {
  return (
    <Column spacing={4} modifiers={[fillMaxWidth()]}>
      <FieldText role="secondary" danger={isInvalid(props)}>
        {props.label}
      </FieldText>
      <NativeTextField {...props} {...useFilledBox()} />
      <SupportingLine line={line} danger={isInvalid(props)} />
    </Column>
  );
}

// Android's universal field draws no container, so the box takes the muted surface token, as Paper's field does.
function useFilledBox(): FieldBox {
  const fill = String(useCSSVariable('--color-muted'));

  return {
    style: { backgroundColor: fill, borderRadius: 16, padding: 16 },
    modifiers: [fillMaxWidth()],
  };
}

function SupportingLine(props: {
  line?: string;
  danger: boolean;
}): React.JSX.Element | null {
  if (!props.line) return null;

  return (
    <FieldText role="secondary" danger={props.danger}>
      {props.line}
    </FieldText>
  );
}

// The universal text field, following the form's value and blurring only once the person has left it.
function NativeTextField(props: NativeFieldProps): React.JSX.Element {
  return (
    <TextInput
      {...useFieldValue(props)}
      {...fieldBehaviour(props)}
      textStyle={useUniversalTextStyle(props.mono ? 'code' : 'body')}
    />
  );
}

function useFieldValue(
  props: NativeFieldProps,
): Pick<UniversalTextInputProps, 'value' | 'onFocus' | 'onBlur'> {
  const text = useNativeState(props.value);
  useFollowedText(text, props.value);
  const focus = useMemo(() => blurOnFocusLoss(props.onBlur), [props.onBlur]);

  return {
    value: text,
    onFocus: () => focus(true),
    onBlur: () => focus(false),
  };
}

function fieldBehaviour(props: NativeFieldProps): UniversalTextInputProps {
  return {
    onChangeText: props.onChangeText,
    placeholder: props.placeholder,
    editable: !props.disabled,
    autoCapitalize: 'none',
    autoCorrect: false,
    keyboardType: props.keyboardType,
    textAlign: props.textAlign,
    style: props.style,
    modifiers: [...(props.modifiers ?? []), ...namedField(props.label)],
  };
}

// Android reads the label drawn beside the field; SwiftUI's field needs it named.
const namedField = (label: string): Modifiers =>
  Platform.OS === 'ios' ? [accessibilityLabel(label)] : [];

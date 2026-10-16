// The universal TextInput draws Compose's undecorated BasicTextField; Android forms want Material's outlined field.
import {
  OutlinedTextField,
  type OutlinedTextFieldProps,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { codeFace } from '#primitives/display/native-text';
import type { FieldProps } from '#primitives/fields/field';
import { errorMessage } from '#primitives/fields/field-errors';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { useFieldText } from './text-input-field-text';
import { requiredLabel } from './text-input-label';
import { FieldProgress } from './text-input-progress';
import { isInvalid, type PhoneFieldProps } from './text-input-props';

const fullWidth = [fillMaxWidth()];

export function PhoneField(props: PhoneFieldProps): React.JSX.Element {
  const text = useNativeState(props.value);
  const { onChangeText, onFocusChanged } = useFieldText(text, props);

  return (
    <OutlinedTextField
      value={text}
      onValueChange={onChangeText}
      onFocusChanged={onFocusChanged}
      {...fieldBehaviour(props)}
      colors={useMaterialPalette().outlinedFieldColors}
    >
      <FieldSlots {...props} />
    </OutlinedTextField>
  );
}

// Compose slots draw only Compose views. The label slot also names the field for TalkBack.
function FieldSlots(props: PhoneFieldProps): React.JSX.Element {
  return (
    <>
      <Label {...props} />
      <Placeholder text={props.placeholder} />
      <SupportingText text={supportingLine(props)} />
      <Progress {...props} />
    </>
  );
}

const supportingLine = (props: PhoneFieldProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

function fieldBehaviour(props: PhoneFieldProps): OutlinedTextFieldProps {
  return {
    enabled: !props.disabled,
    isError: isInvalid(props),
    singleLine: true,
    modifiers: fieldModifiers(props),
    textStyle: codeFace(props.mono).textStyle,
    keyboardOptions: {
      capitalization: 'none',
      autoCorrectEnabled: false,
      keyboardType: props.numeric ? 'decimal' : 'text',
    },
  };
}

// A field without a label keeps the plain outline; its placeholder says what to type.
function Label(props: PhoneFieldProps): React.JSX.Element | null {
  if (props.labelHidden) return null;

  return (
    <OutlinedTextField.Label>
      <Text>{requiredLabel(props)}</Text>
    </OutlinedTextField.Label>
  );
}

// Without the label slot, TalkBack still hears the field's name.
function fieldModifiers(
  props: PhoneFieldProps,
): OutlinedTextFieldProps['modifiers'] {
  if (!props.labelHidden) return fullWidth;

  return [...fullWidth, semantics({ contentDescription: props.label })];
}

function Placeholder(props: { text?: string }): React.JSX.Element | null {
  if (!props.text) return null;

  return (
    <OutlinedTextField.Placeholder>
      <Text>{props.text}</Text>
    </OutlinedTextField.Placeholder>
  );
}

function Progress(props: PhoneFieldProps): React.JSX.Element | null {
  if (!props.loading) return null;

  return (
    <OutlinedTextField.TrailingIcon>
      <FieldProgress label={props.label} loading />
    </OutlinedTextField.TrailingIcon>
  );
}

function SupportingText(props: { text?: string }): React.JSX.Element | null {
  if (!props.text) return null;

  return (
    <OutlinedTextField.SupportingText>
      <Text>{props.text}</Text>
    </OutlinedTextField.SupportingText>
  );
}

// The field says its own hint and error as supporting text, so no footer repeats them.
export function PhoneFieldWithFooter(props: FieldProps): React.ReactNode {
  return props.children;
}

PhoneField satisfies React.ComponentType<PhoneFieldProps>;

// The universal TextInput draws Compose's undecorated BasicTextField; Android forms want Material's outlined field.
import {
  OutlinedTextField,
  type OutlinedTextFieldProps,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { codeFace } from '#primitives/content/native-text';
import type { FieldProps } from '#primitives/fields/field';
import { errorMessage } from '#primitives/fields/field-errors';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { useFieldText } from './text-input-field-text';
import { requiredLabel } from './text-input-label';
import { FieldProgress } from './text-input-progress';
import { isInvalid, type PhoneFieldProps } from './text-input-props';

const fullWidth = [fillMaxWidth()];

export function PhoneField(props: PhoneFieldProps): React.JSX.Element {
  return (
    <OutlinedTextField
      {...useFieldValue(props)}
      {...fieldBehaviour(props)}
      {...entryBehaviour(props)}
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

// Compose has no select-on-focus: a field that selects its value opens with all of it selected, the caret otherwise at its end.
type FieldSelection = { start: number; end: number };

function openingSelection(props: PhoneFieldProps): FieldSelection {
  const end = props.value.length;

  return { start: props.selectOnFocus ? 0 : end, end };
}

type FieldValue = Pick<
  OutlinedTextFieldProps,
  'value' | 'selection' | 'onValueChange' | 'onFocusChanged'
>;

function useFieldValue(props: PhoneFieldProps): FieldValue {
  const text = useNativeState(props.value);
  const { onChangeText, onFocusChanged } = useFieldText(text, props);
  const selection = useNativeState(openingSelection(props));

  return {
    value: text,
    selection,
    onValueChange: onChangeText,
    onFocusChanged,
  };
}

function fieldBehaviour(props: PhoneFieldProps): OutlinedTextFieldProps {
  return {
    enabled: !props.disabled,
    isError: isInvalid(props),
    singleLine: true,
    visualTransformation: props.secure ? 'password' : 'none',
    modifiers: fieldModifiers(props),
    textStyle: codeFace(props.mono).textStyle,
  };
}

// Focus as the field appears, and a field that submits its form shows Done on the keyboard's action key.
function entryBehaviour(props: PhoneFieldProps): OutlinedTextFieldProps {
  return {
    autoFocus: props.focusOnOpen,
    keyboardOptions: keyboardOptions(props),
    keyboardActions: props.onSubmit && { onDone: props.onSubmit },
  };
}

function keyboardOptions(
  props: PhoneFieldProps,
): OutlinedTextFieldProps['keyboardOptions'] {
  return {
    capitalization: 'none',
    autoCorrectEnabled: false,
    keyboardType: keyboardType(props),
    imeAction: props.onSubmit ? 'done' : 'default',
  };
}

function keyboardType(
  props: PhoneFieldProps,
): NonNullable<OutlinedTextFieldProps['keyboardOptions']>['keyboardType'] {
  if (props.secure) return 'password';

  return props.numeric ? 'decimal' : 'text';
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

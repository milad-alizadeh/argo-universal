// The universal TextInput draws Compose's undecorated BasicTextField; Android forms stack Material's outlined field.
import {
  OutlinedTextField,
  type OutlinedTextFieldProps,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { codeFace } from '#primitives/display/native-text';
import type { FieldProps } from '#primitives/fields/field';
import { errorMessage } from '#primitives/fields/field-errors';
import { useFieldText } from './text-input-field-text';
import { FieldProgress } from './text-input-progress';
import {
  isInvalid,
  type PhoneFieldProps,
  requiredLabel,
} from './text-input-props';

const fullWidth = [fillMaxWidth()];

/*
 * Material 3's outlined text field at its stock shape and size: the label floats
 * into the outline on focus or once it holds text, and it says its error, else its
 * hint, as supporting text under it, on its own or as a row. Its label also names it for TalkBack.
 */
export function PhoneField(props: PhoneFieldProps): React.JSX.Element {
  const text = useNativeState(props.value);
  const { onChangeText, onFocusChanged } = useFieldText(text, props);

  return (
    <OutlinedTextField
      value={text}
      onValueChange={onChangeText}
      onFocusChanged={onFocusChanged}
      {...fieldBehaviour(props)}
      colors={useFieldColors()}
    >
      <FieldSlots {...props} />
    </OutlinedTextField>
  );
}

// Compose slots draw only Compose views, so each string goes in a Compose Text.
function FieldSlots(props: PhoneFieldProps): React.JSX.Element {
  return (
    <>
      <OutlinedTextField.Label>
        <Text>{requiredLabel(props)}</Text>
      </OutlinedTextField.Label>
      <Placeholder text={props.placeholder} />
      <SupportingText text={supportingLine(props)} />
      <Progress {...props} />
    </>
  );
}

// The error in its place when there is one, else the hint.
const supportingLine = (props: PhoneFieldProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

function fieldBehaviour(props: PhoneFieldProps): OutlinedTextFieldProps {
  return {
    enabled: !props.disabled,
    isError: isInvalid(props),
    singleLine: true,
    modifiers: fullWidth,
    textStyle: codeFace(props.mono).textStyle,
    keyboardOptions: {
      capitalization: 'none',
      autoCorrectEnabled: false,
      keyboardType: props.numeric ? 'decimal' : 'text',
    },
  };
}

function Placeholder(props: { text?: string }): React.JSX.Element | null {
  if (!props.text) return null;

  return (
    <OutlinedTextField.Placeholder>
      <Text>{props.text}</Text>
    </OutlinedTextField.Placeholder>
  );
}

// While the value is checked, Material's spinner ends the field in its trailing icon slot.
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

// Argo's tokens on Material's states: the resting and disabled outline take Argo's border; the container and other disabled alphas stay stock.
function useFieldColors(): OutlinedTextFieldProps['colors'] {
  const colors = useNativeTheme().colors;

  return {
    focusedTextColor: colors.foreground,
    unfocusedTextColor: colors.foreground,
    errorTextColor: colors.foreground,
    cursorColor: colors.accent,
    focusedIndicatorColor: colors.accent,
    unfocusedIndicatorColor: colors.border,
    disabledIndicatorColor: colors.border,
    focusedLabelColor: colors.accent,
    ...mutedColors(colors.mutedForeground),
    ...errorColors(colors.danger),
  };
}

function mutedColors(
  muted: string | undefined,
): OutlinedTextFieldProps['colors'] {
  return {
    unfocusedLabelColor: muted,
    focusedPlaceholderColor: muted,
    unfocusedPlaceholderColor: muted,
    focusedSupportingTextColor: muted,
    unfocusedSupportingTextColor: muted,
  };
}

function errorColors(
  danger: string | undefined,
): OutlinedTextFieldProps['colors'] {
  return {
    errorCursorColor: danger,
    errorIndicatorColor: danger,
    errorLabelColor: danger,
    errorSupportingTextColor: danger,
  };
}

// The field says its own hint and error, so no Field footer repeats them under it.
export function PhoneFieldFrame(props: FieldProps): React.ReactNode {
  return props.children;
}

PhoneField satisfies React.ComponentType<PhoneFieldProps>;

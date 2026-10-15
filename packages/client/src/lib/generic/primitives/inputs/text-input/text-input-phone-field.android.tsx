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
import { useFieldText } from './text-input-field-text';
import {
  isInvalid,
  type PhoneFieldProps,
  requiredLabel,
} from './text-input-props';

const fullWidth = [fillMaxWidth()];

/*
 * Material 3's outlined text field at its stock shape and size: the label floats
 * into the outline on focus or once it holds text, and a row says its error, else
 * its hint, as supporting text under it. Its label also names it for TalkBack.
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
      <SupportingText text={props.supportingText} />
    </>
  );
}

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

function SupportingText(props: { text?: string }): React.JSX.Element | null {
  if (!props.text) return null;

  return (
    <OutlinedTextField.SupportingText>
      <Text>{props.text}</Text>
    </OutlinedTextField.SupportingText>
  );
}

// Argo's tokens on Material's states; the outline, container and disabled alphas otherwise stay stock.
function useFieldColors(): OutlinedTextFieldProps['colors'] {
  const colors = useNativeTheme().colors;

  return {
    focusedTextColor: colors.foreground,
    unfocusedTextColor: colors.foreground,
    errorTextColor: colors.foreground,
    cursorColor: colors.accent,
    focusedIndicatorColor: colors.accent,
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

PhoneField satisfies React.ComponentType<PhoneFieldProps>;

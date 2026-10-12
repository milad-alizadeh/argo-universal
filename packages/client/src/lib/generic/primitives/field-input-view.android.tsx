import { Text, TextField, useNativeState } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useMemo } from 'react';
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import { useFollowedText } from './field-input-text';
import {
  FieldInput as WideFieldInput,
  isInvalid,
} from './field-input-view.tsx';
import type { FieldInputProps } from './field-props';
import { blurOnFocusLoss } from './focus-loss';
import { useComposeTextStyle } from './native-typography';

export function FieldInput(props: FieldInputProps): React.JSX.Element {
  const Field = useWide() ? WideFieldInput : FormField;
  return <Field {...props} />;
}

// A Material filled field on the section's tile colour, its label floating inside it.
function FormField(props: FieldInputProps): React.JSX.Element {
  const text = useNativeState(props.value);
  useFollowedText(text, props.value);
  const { fontFamily, fontSize, lineHeight, fontWeight } = useComposeTextStyle(
    props.mono ? 'code' : 'body',
  );
  const { muted } = useNativeTheme().colors;
  const onFocusChanged = useMemo(
    () => blurOnFocusLoss(props.onBlur),
    [props.onBlur],
  );
  return (
    <TextField
      value={text}
      onValueChange={props.onChange}
      onFocusChanged={onFocusChanged}
      enabled={!props.disabled}
      isError={isInvalid(props)}
      singleLine
      textStyle={{ fontFamily, fontSize, lineHeight, fontWeight }}
      keyboardOptions={{ capitalization: 'none', autoCorrectEnabled: false }}
      colors={{ focusedContainerColor: muted, unfocusedContainerColor: muted }}
      modifiers={[fillMaxWidth()]}
    >
      <FieldSlots {...props} />
    </TextField>
  );
}

// Compose slots draw only Compose views, so each string goes in a Compose Text.
function FieldSlots(props: FieldInputProps): React.JSX.Element {
  return (
    <>
      <TextField.Label>
        <Text>{props.label}</Text>
      </TextField.Label>
      {props.placeholder ? (
        <TextField.Placeholder>
          <Text>{props.placeholder}</Text>
        </TextField.Placeholder>
      ) : null}
    </>
  );
}

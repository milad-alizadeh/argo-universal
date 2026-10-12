import { TextField, useNativeState } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import { useFollowedText } from './field-input-text';
import {
  FieldInput as WideFieldInput,
  isInvalid,
} from './field-input-view.tsx';
import type { FieldInputProps } from './field-props';
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
  return (
    <TextField
      value={text}
      onValueChange={props.onChange}
      onFocusChanged={(focused) => focused || props.onBlur?.()}
      enabled={!props.disabled}
      isError={isInvalid(props)}
      singleLine
      textStyle={{ fontFamily, fontSize, lineHeight, fontWeight }}
      keyboardOptions={{ capitalization: 'none', autoCorrectEnabled: false }}
      colors={{ focusedContainerColor: muted, unfocusedContainerColor: muted }}
      modifiers={[fillMaxWidth()]}
    >
      <TextField.Label>{props.label}</TextField.Label>
      {props.placeholder ? (
        <TextField.Placeholder>{props.placeholder}</TextField.Placeholder>
      ) : null}
    </TextField>
  );
}

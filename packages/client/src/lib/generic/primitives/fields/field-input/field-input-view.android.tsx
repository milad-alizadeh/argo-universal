import { Text, TextField, useNativeState } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useMemo } from 'react';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { useComposeTextStyle } from '../../native/native-typography';
import { errorMessage } from '../field-errors';
import type { FieldInputProps } from '../field-props';
import { useFollowedText } from './field-input-text';
import {
  FieldInput as WideFieldInput,
  isInvalid,
} from './field-input-view.tsx';
import { blurOnFocusLoss } from './focus-loss';

export function FieldInput(props: FieldInputProps): React.JSX.Element {
  const Field = useWide() ? WideFieldInput : FormField;

  return <Field {...props} />;
}

// A bare Material filled field on the muted fill, its label floating inside it and its hint or error under it.
function FormField(props: FieldInputProps): React.JSX.Element {
  const text = useNativeState(props.value);
  useFollowedText(text, props.value);
  const onFocusChanged = useFocusLossHandler(props.onBlur);
  const appearance = useFieldAppearance(props.mono);

  return (
    <TextField {...fieldBehaviour(props, text, onFocusChanged)} {...appearance}>
      <FieldSlots {...props} />
    </TextField>
  );
}

type TextFieldProps = React.ComponentProps<typeof TextField>;

function useFocusLossHandler(
  onBlur: FieldInputProps['onBlur'],
): ReturnType<typeof blurOnFocusLoss> {
  return useMemo(() => blurOnFocusLoss(onBlur), [onBlur]);
}

function fieldBehaviour(
  props: FieldInputProps,
  text: TextFieldProps['value'],
  onFocusChanged: TextFieldProps['onFocusChanged'],
): TextFieldProps {
  return {
    value: text,
    onValueChange: props.onChange,
    onFocusChanged,
    enabled: !props.disabled,
    isError: isInvalid(props),
  };
}

function useFieldAppearance(mono: FieldInputProps['mono']): TextFieldProps {
  const { fontFamily, fontSize, lineHeight, fontWeight } = useComposeTextStyle(
    mono ? 'code' : 'body',
  );

  const { muted } = useNativeTheme().colors;

  return {
    singleLine: true,
    textStyle: { fontFamily, fontSize, lineHeight, fontWeight },
    keyboardOptions: { capitalization: 'none', autoCorrectEnabled: false },
    colors: { focusedContainerColor: muted, unfocusedContainerColor: muted },
    modifiers: [fillMaxWidth()],
  };
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
      <SupportingLine {...props} />
    </>
  );
}

// Material's supporting text: the error in its place when there is one, else the hint.
const supportingLine = (props: FieldInputProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

function SupportingLine(props: FieldInputProps): React.JSX.Element | null {
  const line = supportingLine(props);

  if (!line) return null;

  return (
    <TextField.SupportingText>
      <Text>{line}</Text>
    </TextField.SupportingText>
  );
}

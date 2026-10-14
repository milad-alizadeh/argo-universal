import { Text, TextField, useNativeState } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useMemo } from 'react';
import { errorMessage } from '#primitives/fields/field-errors';
import { useFollowedText } from '#primitives/native/followed-text';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { blurOnFocusLoss } from './focus-loss';
import { isInvalid, type TextFieldProps } from './text-input-props';
import { RowTextInput as WideRowTextInput } from './text-input-row.tsx';

export function RowTextInput(props: TextFieldProps): React.JSX.Element {
  const Field = useWide() ? WideRowTextInput : FormField;

  return <Field {...props} />;
}

// A bare Material filled field on the muted fill, its label floating inside it and its hint or error under it.
function FormField(props: TextFieldProps): React.JSX.Element {
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

type ComposeFieldProps = React.ComponentProps<typeof TextField>;

function useFocusLossHandler(
  onBlur: TextFieldProps['onBlur'],
): ReturnType<typeof blurOnFocusLoss> {
  return useMemo(() => blurOnFocusLoss(onBlur), [onBlur]);
}

function fieldBehaviour(
  props: TextFieldProps,
  text: ComposeFieldProps['value'],
  onFocusChanged: ComposeFieldProps['onFocusChanged'],
): ComposeFieldProps {
  return {
    value: text,
    onValueChange: props.onChange,
    onFocusChanged,
    enabled: !props.disabled,
    isError: isInvalid(props),
  };
}

function useFieldAppearance(mono: TextFieldProps['mono']): ComposeFieldProps {
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
function FieldSlots(props: TextFieldProps): React.JSX.Element {
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
const supportingLine = (props: TextFieldProps): string | undefined =>
  errorMessage(props.errors ?? []) ?? props.hint;

function SupportingLine(props: TextFieldProps): React.JSX.Element | null {
  const line = supportingLine(props);

  if (!line) return null;

  return (
    <TextField.SupportingText>
      <Text>{line}</Text>
    </TextField.SupportingText>
  );
}

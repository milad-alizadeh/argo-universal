import {
  OutlinedTextField,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { useMemo } from 'react';
import { useComposeTextStyle } from '../../native/native-typography';
import { useFollowedText } from './field-input-text';
import { isInvalid } from './field-input.tsx';
import { blurOnFocusLoss } from './focus-loss';
import type { StandaloneFieldInputProps } from './standalone-field-input-props';
import { StandaloneNativeField } from './standalone-native-field';

export function StandaloneFieldInput(
  props: StandaloneFieldInputProps,
): ReactElement {
  return (
    <StandaloneNativeField {...props}>
      <NativeField {...props} />
    </StandaloneNativeField>
  );
}

function NativeField(props: StandaloneFieldInputProps): ReactElement {
  const field = useFieldProps(props);

  return (
    <OutlinedTextField {...field}>
      <FieldLabel {...props} />
      <FieldPlaceholder {...props} />
    </OutlinedTextField>
  );
}

function FieldLabel(props: StandaloneFieldInputProps): ReactElement {
  return (
    <OutlinedTextField.Label>
      <Text>
        {props.label}
        {props.required ? ' *' : ''}
      </Text>
    </OutlinedTextField.Label>
  );
}

function FieldPlaceholder(
  props: StandaloneFieldInputProps,
): ReactElement | null {
  if (!props.placeholder) return null;

  return (
    <OutlinedTextField.Placeholder>
      <Text>{props.placeholder}</Text>
    </OutlinedTextField.Placeholder>
  );
}

type FieldProps = ComponentProps<typeof OutlinedTextField>;

function useFieldProps(props: StandaloneFieldInputProps): FieldProps {
  const value = useNativeState(props.value);
  useFollowedText(value, props.value);
  const textStyle = useFieldTextStyle(props.mono);

  const onFocusChanged = useMemo(
    () => blurOnFocusLoss(props.onBlur),
    [props.onBlur],
  );

  return { value, textStyle, onFocusChanged, ...fieldBehaviour(props) };
}

function useFieldTextStyle(
  mono: StandaloneFieldInputProps['mono'],
): FieldProps['textStyle'] {
  const { fontFamily, fontSize, lineHeight, fontWeight } = useComposeTextStyle(
    mono ? 'code' : 'body',
  );

  return { fontFamily, fontSize, lineHeight, fontWeight };
}

function fieldBehaviour(props: StandaloneFieldInputProps): FieldProps {
  return {
    onValueChange: props.onChange,
    enabled: !props.disabled,
    isError: isInvalid(props),
    singleLine: true,
    modifiers: [fillMaxWidth()],
    keyboardOptions: {
      capitalization: 'none',
      autoCorrectEnabled: false,
      keyboardType: props.numeric ? 'decimal' : 'text',
    },
  };
}

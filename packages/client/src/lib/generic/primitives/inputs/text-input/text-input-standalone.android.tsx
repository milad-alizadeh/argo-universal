import {
  OutlinedTextField,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { useMemo } from 'react';
import { useFollowedText } from '#primitives/native/followed-text';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { blurOnFocusLoss } from './focus-loss';
import { OutlinedFieldLoading } from './text-input-loading.android';
import { isInvalid, type StandaloneTextInputProps } from './text-input-props';
import { StandaloneNativeField } from './text-input-standalone-native';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  return (
    <StandaloneNativeField {...props}>
      <NativeField {...props} />
    </StandaloneNativeField>
  );
}

function NativeField(props: StandaloneTextInputProps): ReactElement {
  const field = useFieldProps(props);

  return (
    <OutlinedTextField {...field}>
      <FieldLabel {...props} />
      <FieldPlaceholder {...props} />
      <OutlinedFieldLoading loading={props.loading} />
    </OutlinedTextField>
  );
}

function FieldLabel(props: StandaloneTextInputProps): ReactElement {
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
  props: StandaloneTextInputProps,
): ReactElement | null {
  if (!props.placeholder) return null;

  return (
    <OutlinedTextField.Placeholder>
      <Text>{props.placeholder}</Text>
    </OutlinedTextField.Placeholder>
  );
}

type FieldProps = ComponentProps<typeof OutlinedTextField>;

function useFieldProps(props: StandaloneTextInputProps): FieldProps {
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
  mono: StandaloneTextInputProps['mono'],
): FieldProps['textStyle'] {
  const { fontFamily, fontSize, lineHeight, fontWeight } = useComposeTextStyle(
    mono ? 'code' : 'body',
  );

  return { fontFamily, fontSize, lineHeight, fontWeight };
}

function fieldBehaviour(props: StandaloneTextInputProps): FieldProps {
  return {
    onValueChange: props.onChangeText,
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

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;

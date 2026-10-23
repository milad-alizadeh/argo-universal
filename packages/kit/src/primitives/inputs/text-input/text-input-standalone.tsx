import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { requiredLabel } from '../../../required-label';
import { BareTextInput } from './text-input-bare';
import {
  keyboardOf,
  focusOf,
  type StandaloneTextInputProps,
} from './text-input-props';
import { FieldSpinner } from './text-input-spinner';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  return (
    <View className="gap-1.5">
      <FieldLabel {...props} />
      <View className="flex-row items-center gap-2">
        <BareTextInput {...inputProps(props)} />
        <FieldSpinner {...props} />
      </View>
    </View>
  );
}

function FieldLabel(props: StandaloneTextInputProps): ReactElement | null {
  if (props.labelHidden) return null;

  return (
    <Text aria-hidden role="body">
      {requiredLabel(props)}
    </Text>
  );
}

type InputProps = ComponentProps<typeof BareTextInput>;

function inputProps(
  props: StandaloneTextInputProps,
): InputProps & { 'aria-required'?: boolean } {
  return {
    ...inputBehaviour(props),
    'aria-required': props.required,
    'aria-invalid': props.invalid,
    className: 'flex-1 rounded-control type-control shadow-none dark:bg-card',
  };
}

function inputBehaviour(props: StandaloneTextInputProps): InputProps {
  return {
    variant: 'bare',
    accessibilityLabel: props.label,
    value: props.value,
    onChangeText: props.onChangeText,
    ...focusOf(props),
    placeholder: props.placeholder,
    editable: !props.disabled,
    ...keyboardOf(props),
    onSubmitEditing: props.onSubmit,
  };
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;

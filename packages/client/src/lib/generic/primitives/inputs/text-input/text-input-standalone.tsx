import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { Field } from '#primitives/fields/field';
import { useFooterDescription } from '#primitives/fields/field-description';
import { BareTextInput } from './text-input-bare';
import { isInvalid, type StandaloneTextInputProps } from './text-input-props';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  return (
    <Field {...props}>
      <TextField {...props} />
    </Field>
  );
}

function TextField(props: StandaloneTextInputProps): ReactElement {
  const describedBy = useFooterDescription({
    invalid: isInvalid(props),
    hint: props.hint,
  });

  return (
    <View className="gap-1.5">
      <FieldLabel {...props} />
      <BareTextInput {...inputProps(props)} aria-describedby={describedBy} />
    </View>
  );
}

function FieldLabel(props: StandaloneTextInputProps): ReactElement {
  return (
    <Text aria-hidden role="body">
      {props.label}
      {props.required ? ' *' : ''}
    </Text>
  );
}

type InputProps = ComponentProps<typeof BareTextInput>;

function inputProps(props: StandaloneTextInputProps): InputProps & {
  'aria-invalid': boolean;
  'aria-required'?: boolean;
} {
  return {
    ...inputBehaviour(props),
    'aria-invalid': isInvalid(props),
    'aria-required': props.required,
    className: 'rounded-lg type-control shadow-none dark:bg-background',
  };
}

function inputBehaviour(props: StandaloneTextInputProps): InputProps {
  return {
    variant: 'bare',
    accessibilityLabel: props.label,
    value: props.value,
    onChangeText: props.onChangeText,
    onBlur: props.onBlur,
    placeholder: props.placeholder,
    editable: !props.disabled,
    keyboardType: props.numeric ? 'numbers-and-punctuation' : 'default',
  };
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;

import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '../../display/text/text';
import { useFooterDescription } from '../../fields/field-footer';
import { StandaloneField } from '../../fields/standalone-field';
import { BareTextInput } from './text-input-bare';
import { isInvalid, type StandaloneTextInputProps } from './text-input-props';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  return (
    <StandaloneField {...props}>
      <TextField {...props} />
    </StandaloneField>
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
    appearance: 'bare',
    accessibilityLabel: props.label,
    value: props.value,
    onChangeText: props.onChange,
    onBlur: props.onBlur,
    placeholder: props.placeholder,
    editable: !props.disabled,
    keyboardType: props.numeric ? 'numbers-and-punctuation' : 'default',
  };
}

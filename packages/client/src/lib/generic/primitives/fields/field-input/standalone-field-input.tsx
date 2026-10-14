import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '../../display/text/text';
import { Input } from '../../inputs/input/input';
import { useFooterDescription } from '../field-footer';
import { isInvalid } from './field-input-view';
import { StandaloneField } from './standalone-field';
import type { StandaloneFieldInputProps } from './standalone-field-input-props';

export function StandaloneFieldInput(
  props: StandaloneFieldInputProps,
): ReactElement {
  return (
    <StandaloneField {...props}>
      <TextField {...props} />
    </StandaloneField>
  );
}

function TextField(props: StandaloneFieldInputProps): ReactElement {
  const describedBy = useFooterDescription({
    invalid: isInvalid(props),
    hint: props.hint,
  });

  return (
    <View className="gap-1.5">
      <FieldLabel {...props} />
      <Input {...inputProps(props)} aria-describedby={describedBy} />
    </View>
  );
}

function FieldLabel(props: StandaloneFieldInputProps): ReactElement {
  return (
    <Text aria-hidden role="body">
      {props.label}
      {props.required ? ' *' : ''}
    </Text>
  );
}

type InputProps = ComponentProps<typeof Input>;

function inputProps(props: StandaloneFieldInputProps): InputProps & {
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

function inputBehaviour(props: StandaloneFieldInputProps): InputProps {
  return {
    accessibilityLabel: props.label,
    value: props.value,
    onChangeText: props.onChange,
    onBlur: props.onBlur,
    placeholder: props.placeholder,
    editable: !props.disabled,
    keyboardType: props.numeric ? 'numbers-and-punctuation' : 'default',
  };
}

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
  return (
    <View className="gap-1.5">
      <Text aria-hidden role="body">
        {props.label}
        {props.required ? ' *' : ''}
      </Text>
      <Input
        {...inputProps(props)}
        aria-describedby={useFooterDescription({
          invalid: isInvalid(props),
          hint: props.hint,
        })}
      />
    </View>
  );
}

function inputProps(props: StandaloneFieldInputProps): ComponentProps<
  typeof Input
> & {
  'aria-invalid': boolean;
  'aria-required'?: boolean;
} {
  return {
    accessibilityLabel: props.label,
    value: props.value,
    onChangeText: props.onChange,
    onBlur: props.onBlur,
    placeholder: props.placeholder,
    editable: !props.disabled,
    keyboardType: props.numeric ? 'numbers-and-punctuation' : 'default',
    'aria-invalid': isInvalid(props),
    'aria-required': props.required,
    className: 'rounded-lg type-control shadow-none dark:bg-background',
  };
}

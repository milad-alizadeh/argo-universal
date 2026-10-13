import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import { StandaloneField } from '#primitives/fields/field-input/standalone-field';
import { Checkbox } from '#primitives/inputs/checkbox/checkbox';
import type { ElicitationFieldProps } from './elicitation-field';
import { elicitationChoices } from './elicitation-schema';

type ChoicesProps = ElicitationFieldProps & {
  label: string;
  hint?: string;
  errors?: readonly unknown[];
};

export function ElicitationChoices(props: ChoicesProps): ReactElement {
  const options = elicitationChoices(props.property) ?? [];
  return (
    <StandaloneField errors={props.errors} hint={props.hint}>
      <Text role="body">
        {props.label}
        {props.required ? ' *' : ''}
      </Text>
      <View role="group" accessibilityLabel={props.label} className="gap-2">
        {options.map((option) => (
          <Checkbox key={option.const} {...choiceProps(props, option)} />
        ))}
      </View>
    </StandaloneField>
  );
}

function choiceProps(
  props: ChoicesProps,
  option: { const: string; title: string },
): ComponentProps<typeof Checkbox> {
  const values = Array.isArray(props.value) ? props.value : [];
  return {
    label: option.title,
    value: values.includes(option.const),
    disabled: props.inactive,
    errors: props.errors,
    hint: props.hint,
    onBlur: props.onBlur,
    onChange: (checked: boolean): void =>
      props.onChange(
        checked
          ? [...values, option.const]
          : values.filter((value) => value !== option.const),
      ),
  };
}

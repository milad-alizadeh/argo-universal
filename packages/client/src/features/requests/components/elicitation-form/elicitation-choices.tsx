import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import { StandaloneField } from '#primitives/fields/field-input/standalone-field';
import { Checkbox } from '#primitives/inputs/checkbox/checkbox';
import type { ElicitationFieldProps } from './elicitation-field';
import { elicitationChoices } from './elicitation-property';

type ChoicesProps = ElicitationFieldProps & {
  label: string;
  hint?: string;
  errors?: readonly unknown[];
};

export function ElicitationChoices(props: ChoicesProps): ReactElement {
  return (
    <StandaloneField errors={props.errors} hint={props.hint}>
      <Text role="body">
        {props.label}
        {props.required ? ' *' : ''}
      </Text>
      <ChoiceGroup {...props} />
    </StandaloneField>
  );
}

function ChoiceGroup(props: ChoicesProps): ReactElement {
  const options = elicitationChoices(props.property) ?? [];
  return (
    <View role="group" accessibilityLabel={props.label} className="gap-2">
      {options.map((option) => (
        <Checkbox key={option.const} {...choiceProps(props, option)} />
      ))}
    </View>
  );
}

function choiceProps(
  props: ChoicesProps,
  option: { const: string; title: string },
): ComponentProps<typeof Checkbox> {
  const values = Array.isArray(props.value) ? props.value : [];
  return {
    ...sharedProps(props),
    label: option.title,
    value: values.includes(option.const),
    onChange: (checked: boolean): void =>
      props.onChange(toggledChoice(values, option.const, checked)),
  };
}

function sharedProps(
  props: ChoicesProps,
): Pick<
  ComponentProps<typeof Checkbox>,
  'disabled' | 'errors' | 'hint' | 'onBlur'
> {
  return {
    disabled: props.inactive,
    errors: props.errors,
    hint: props.hint,
    onBlur: props.onBlur,
  };
}

function toggledChoice(
  values: string[],
  choice: string,
  checked: boolean,
): string[] {
  return checked
    ? [...values, choice]
    : values.filter((value) => value !== choice);
}

import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import type { FieldErrors } from '#primitives/fields/field-errors';
import { StandaloneField } from '#primitives/fields/standalone-field';
import { Checkbox } from '#primitives/inputs/checkbox';
import { toggledChoice } from './elicitation-answers';
import type { ElicitationFieldProps } from './elicitation-field';
import { elicitationChoices } from './elicitation-property';

type ChoicesProps = ElicitationFieldProps & {
  label: string;
  hint?: string;
  errors?: FieldErrors;
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
    ...checkboxFieldProps(props),
    label: option.title,
    value: values.includes(option.const),
    onChange: (checked: boolean): void =>
      props.onChange(toggledChoice(values, option.const, checked)),
  };
}

function checkboxFieldProps(
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

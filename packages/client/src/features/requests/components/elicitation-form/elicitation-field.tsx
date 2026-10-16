import type { ElicitationPropertySchema } from '@repo/contracts';
import type { ReactElement } from 'react';
import { Checkbox } from '#primitives/inputs/checkbox';
import { Combobox } from '#primitives/inputs/combobox';
import { Picker, type PickerProps } from '#primitives/inputs/picker';
import {
  TextInput,
  type StandaloneTextInputProps,
} from '#primitives/inputs/text-input';
import { ElicitationChoices } from './elicitation-choices';
import { elicitationChoices, numericProperty } from './elicitation-property';
import type { ElicitationValue } from './elicitation-schema';

export type ElicitationFieldProps = {
  name: string;
  property: ElicitationPropertySchema;
  required: boolean;
  value: ElicitationValue | undefined;
  error?: string;
  showError: boolean;
  onChange: (value: ElicitationValue) => void;
  onBlur: () => void;
  inactive: boolean;
};

export function ElicitationField(props: ElicitationFieldProps): ReactElement {
  if (props.property.type === 'boolean') return <BooleanField {...props} />;

  if (elicitationChoices(props.property)) return <ChoiceField {...props} />;

  return <TextInput {...textProps(props)} />;
}

export function fieldProps(
  props: ElicitationFieldProps,
): Pick<
  StandaloneTextInputProps,
  'label' | 'disabled' | 'errors' | 'hint' | 'onBlur'
> {
  return {
    label: props.property.title ?? props.name,
    onBlur: props.onBlur,
    disabled: props.inactive,
    errors: shownErrors(props),
    hint: props.property.description,
  };
}

export const shownErrors = (props: ElicitationFieldProps): string[] =>
  props.showError && props.error ? [props.error] : [];

export function textProps(
  props: ElicitationFieldProps,
): StandaloneTextInputProps {
  return {
    ...fieldProps(props),
    required: props.required,
    numeric: numericProperty(props.property),
    value: props.value === undefined ? '' : String(props.value),
    onChangeText: props.onChange,
  };
}

function BooleanField(props: ElicitationFieldProps): ReactElement {
  return (
    <Checkbox
      {...fieldProps(props)}
      value={props.value === true}
      onValueChange={props.onChange}
    />
  );
}

function ChoiceField(props: ElicitationFieldProps): ReactElement {
  if (props.property.type === 'array')
    return <ElicitationChoices {...props} {...fieldProps(props)} />;

  return <PickerField {...props} />;
}

export const longChoiceLimit = 7;

function PickerField(props: ElicitationFieldProps): ReactElement {
  const choice = pickerProps(props);

  return choice.options.length > longChoiceLimit ? (
    <Combobox {...choice} />
  ) : (
    <Picker {...choice} />
  );
}

export function pickerProps(props: ElicitationFieldProps): PickerProps<string> {
  const options = elicitationChoices(props.property) ?? [];

  return {
    ...fieldProps(props),
    required: props.required,
    value: typeof props.value === 'string' ? props.value : undefined,
    options: options.map((option) => ({
      value: option.const,
      label: option.title,
    })),
    onValueChange: props.onChange,
  };
}

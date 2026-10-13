import type { ElicitationPropertySchema } from '@repo/contracts';
import type { ComponentProps, ReactElement } from 'react';
import { StandaloneFieldInput } from '#primitives/fields/field-input/standalone-field-input';
import { Checkbox } from '#primitives/inputs/checkbox/checkbox';
import { Picker } from '#primitives/inputs/picker/picker';
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

  return <StandaloneFieldInput {...textProps(props)} />;
}

function fieldProps(
  props: ElicitationFieldProps,
): Pick<
  ComponentProps<typeof StandaloneFieldInput>,
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

const shownErrors = (props: ElicitationFieldProps): string[] =>
  props.showError && props.error ? [props.error] : [];

function textProps(
  props: ElicitationFieldProps,
): ComponentProps<typeof StandaloneFieldInput> {
  return {
    ...fieldProps(props),
    required: props.required,
    numeric: numericProperty(props.property),
    value: props.value === undefined ? '' : String(props.value),
    onChange: props.onChange,
  };
}

function BooleanField(props: ElicitationFieldProps): ReactElement {
  return (
    <Checkbox
      {...fieldProps(props)}
      value={props.value === true}
      onChange={props.onChange}
    />
  );
}

function ChoiceField(props: ElicitationFieldProps): ReactElement {
  if (props.property.type === 'array')
    return <ElicitationChoices {...props} {...fieldProps(props)} />;

  return <PickerField {...props} />;
}

function PickerField(props: ElicitationFieldProps): ReactElement {
  const options = elicitationChoices(props.property) ?? [];

  return (
    <Picker
      required={props.required}
      {...fieldProps(props)}
      value={typeof props.value === 'string' ? props.value : undefined}
      options={options.map((option) => ({
        value: option.const,
        label: option.title,
      }))}
      onChange={props.onChange}
    />
  );
}

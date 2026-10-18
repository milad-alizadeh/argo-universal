import type { ElicitationPropertySchema } from '@repo/contracts';
import type { ReactElement } from 'react';
import { type StandaloneTextInputProps } from '#primitives/inputs/text-input';
import { ListItem } from '#primitives/lists/list-item';
import { toggledChoice } from './elicitation-answers';
import { OptionRows } from './elicitation-option-rows';
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
  // The form's only field: the heading already asks for it, so its row draws no label.
  lone: boolean;
};

export const fieldLabel = (
  props: Pick<ElicitationFieldProps, 'name' | 'property'>,
): string => props.property.title ?? props.name;

/*
 * One schema property: a switch row for a boolean, an option row for each choice, and a field to
 * type in, never a row, for text or a number.
 */
export function FieldRows(props: ElicitationFieldProps): ReactElement {
  if (props.property.type === 'boolean') return <SwitchRow {...props} />;

  if (elicitationChoices(props.property)) return <ChoiceRows {...props} />;

  return <ListItem.TextField {...textProps(props)} />;
}

function textProps(props: ElicitationFieldProps): StandaloneTextInputProps {
  return {
    label: fieldLabel(props),
    labelHidden: props.lone,
    required: props.required,
    numeric: numericProperty(props.property),
    value: textValue(props.value),
    onChangeText: props.onChange,
    onBlur: props.onBlur,
    disabled: props.inactive,
    errors: shownErrors(props),
    hint: props.property.description,
  };
}

const textValue = (value: ElicitationValue | undefined): string =>
  value === undefined ? '' : String(value);

const shownErrors = (props: ElicitationFieldProps): string[] =>
  props.showError && props.error ? [props.error] : [];

function ChoiceRows(props: ElicitationFieldProps): ReactElement {
  const multiple = props.property.type === 'array';
  const selected = selectedValues(props.value);

  return (
    <OptionRows
      options={elicitationChoices(props.property) ?? []}
      selected={selected}
      multiple={multiple}
      disabled={props.inactive}
      onToggle={(choice, checked) =>
        props.onChange(choiceChange({ multiple, selected, choice, checked }))
      }
    />
  );
}

type ChoiceChange = {
  multiple: boolean;
  selected: string[];
  choice: string;
  checked: boolean;
};

const choiceChange = (change: ChoiceChange): ElicitationValue =>
  change.multiple
    ? toggledChoice(change.selected, change.choice, change.checked)
    : change.choice;

function selectedValues(value: ElicitationValue | undefined): string[] {
  if (Array.isArray(value)) return value;

  return typeof value === 'string' ? [value] : [];
}

function SwitchRow(props: ElicitationFieldProps): ReactElement {
  return (
    <ListItem.Toggle
      title={fieldLabel(props)}
      value={props.value === true}
      disabled={props.inactive}
      description={props.property.description}
      onValueChange={props.onChange}
    />
  );
}

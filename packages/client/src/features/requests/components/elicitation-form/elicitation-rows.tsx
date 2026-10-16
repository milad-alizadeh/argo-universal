import type { ReactElement } from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Combobox } from '#primitives/inputs/combobox';
import { Picker, type PickerProps } from '#primitives/inputs/picker';
import { Switch } from '#primitives/inputs/switch';
import { TextInput } from '#primitives/inputs/text-input';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { toggledChoice } from './elicitation-answers';
import {
  fieldProps,
  longChoiceLimit,
  pickerProps,
  textProps,
  type ElicitationFieldProps,
} from './elicitation-field';
import { elicitationChoices } from './elicitation-property';
import { requiredLabel } from './elicitation-sections';

// A field as rows of a grouped section: the label leads and the value or control trails it.
export function ElicitationRows(props: ElicitationFieldProps): ReactElement {
  if (props.property.type === 'boolean') return <SwitchRow {...props} />;

  return props.property.type === 'array' ? (
    <ChoiceRows {...props} />
  ) : (
    <SingleRow {...props} />
  );
}

function SingleRow(props: ElicitationFieldProps): ReactElement {
  return elicitationChoices(props.property) ? (
    <PickerRow {...props} />
  ) : (
    <TextRow {...props} />
  );
}

function TextRow(props: ElicitationFieldProps): ReactElement {
  return <TextInput variant="row" {...textProps(props)} />;
}

function SwitchRow(props: ElicitationFieldProps): ReactElement {
  const { label, disabled } = fieldProps(props);

  const toggle = (
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      value={props.value === true}
      onValueChange={props.onChange}
    />
  );

  return <GroupedListItem label={label} disabled={disabled} control={toggle} />;
}

// A short list is a menu in the row; a long one pushes a searchable page on the sheet.
function PickerRow(props: ElicitationFieldProps): ReactElement {
  const choice = rowChoice(props);

  if (choice.options.length > longChoiceLimit)
    return <Combobox {...choice} variant="row" />;

  return (
    <GroupedListItem
      label={requiredLabel(choice)}
      disabled={choice.disabled}
      accessory={<Picker {...choice} variant="row" />}
    />
  );
}

// The section's footer says the hint or the error, so the row's control draws neither.
function rowChoice(props: ElicitationFieldProps): PickerProps<string> {
  const { errors = [], ...choice } = pickerProps(props);

  return { ...choice, hint: undefined, invalid: errors.length > 0 };
}

const toggled = (values: string[], choice: string): string[] =>
  toggledChoice(values, choice, !values.includes(choice));

// Each choice is a row that checks and unchecks it, as a Settings checklist does.
function ChoiceRows(props: ElicitationFieldProps): ReactElement {
  const options = elicitationChoices(props.property) ?? [];

  return (
    <>
      {options.map((option) => (
        <ChoiceRow key={option.const} {...props} option={option} />
      ))}
    </>
  );
}

type ChoiceRowProps = ElicitationFieldProps & {
  option: { const: string; title: string };
};

function ChoiceRow({ option, ...props }: ChoiceRowProps): ReactElement {
  const values = Array.isArray(props.value) ? props.value : [];
  const checked = values.includes(option.const);

  return (
    <GroupedListItem
      label={option.title}
      accessibilityRole="button"
      selected={checked}
      disabled={props.inactive}
      accessory={checked ? <SelectedCheck /> : undefined}
      onPress={() => props.onChange(toggled(values, option.const))}
    />
  );
}

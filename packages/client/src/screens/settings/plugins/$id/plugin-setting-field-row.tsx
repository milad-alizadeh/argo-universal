import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { secretRows, TextRow } from './plugin-text-rows';

export interface SettingFieldRowProps {
  field: PluginSettingField;
  settings: PluginSettings;
  onChange: (value: PluginSettingValue) => void;
}

// One schema field as its own section: the FieldGroup row its type names, its description the footer.
export function settingFieldSection(
  props: SettingFieldRowProps,
): React.JSX.Element {
  const { field } = props;

  return (
    <FieldGroup.Section key={field.key} footer={field.description}>
      {fieldRows[field.type](props)}
    </FieldGroup.Section>
  );
}

const textOf = (value: PluginSettingValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const valueOf = ({
  field,
  settings,
}: SettingFieldRowProps): PluginSettingValue | undefined =>
  settings.values[field.key];

function textFieldRow(props: SettingFieldRowProps): React.JSX.Element {
  const value = textOf(valueOf(props)) ?? '';

  return (
    <TextRow
      key={value}
      label={props.field.label}
      value={value}
      onSave={props.onChange}
    />
  );
}

const secretFieldRows = ({
  field,
  settings,
  onChange,
}: SettingFieldRowProps): React.JSX.Element =>
  secretRows({
    label: field.label,
    set: settings.secretsSet.includes(field.key),
    onSave: onChange,
  });

const toggleFieldRow = (props: SettingFieldRowProps): React.JSX.Element => (
  <FieldGroup.Toggle
    title={props.field.label}
    value={valueOf(props) === true}
    onValueChange={props.onChange}
  />
);

function pickerFieldRow(props: SettingFieldRowProps): React.JSX.Element {
  const { field } = props;

  return (
    <FieldGroup.Picker
      title={field.label}
      value={textOf(valueOf(props)) ?? ''}
      options={field.type === 'picker' ? field.options : []}
      presentation="menu"
      onValueChange={props.onChange}
    />
  );
}

// Each field type's rows; the schema's own `type` picks them.
const fieldRows: Record<
  PluginSettingField['type'],
  (props: SettingFieldRowProps) => React.JSX.Element
> = {
  text: textFieldRow,
  secret: secretFieldRows,
  toggle: toggleFieldRow,
  picker: pickerFieldRow,
};

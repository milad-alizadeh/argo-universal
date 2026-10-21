import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { SecretRow, TextRow } from './plugin-text-rows';

export interface SettingFieldRowProps {
  field: PluginSettingField;
  settings: PluginSettings;
  onChange: (value: PluginSettingValue) => void;
}

// One schema field as its own section: the kit row its type names, its description the footer.
export function SettingFieldRow(
  props: SettingFieldRowProps,
): React.JSX.Element {
  const { field } = props;
  const Row = fieldRows[field.type];

  return (
    <ListSection>
      <Row {...props} />
    </ListSection>
  );
}

const textOf = (value: PluginSettingValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const valueOf = ({
  field,
  settings,
}: SettingFieldRowProps): PluginSettingValue | undefined =>
  settings.values[field.key];

function TextFieldRow(props: SettingFieldRowProps): React.JSX.Element {
  const value = textOf(valueOf(props)) ?? '';

  return (
    <TextRow
      key={value}
      label={props.field.label}
      hint={props.field.description}
      value={value}
      onSave={props.onChange}
    />
  );
}

function SecretFieldRow({
  field,
  settings,
  onChange,
}: SettingFieldRowProps): React.JSX.Element {
  return (
    <SecretRow
      label={field.label}
      hint={field.description}
      set={settings.secretsSet.includes(field.key)}
      onSave={onChange}
    />
  );
}

function ToggleFieldRow(props: SettingFieldRowProps): React.JSX.Element {
  return (
    <ListItem.Toggle
      title={props.field.label}
      description={props.field.description}
      value={valueOf(props) === true}
      onValueChange={props.onChange}
    />
  );
}

function PickerFieldRow({
  field,
  ...props
}: SettingFieldRowProps): React.JSX.Element {
  return (
    <ListItem.Picker
      title={field.label}
      description={field.description}
      value={textOf(valueOf({ field, ...props }))}
      options={field.type === 'picker' ? field.options : []}
      onValueChange={props.onChange}
    />
  );
}

// Each field type's row; the schema's own `type` picks it.
const fieldRows: Record<
  PluginSettingField['type'],
  (props: SettingFieldRowProps) => React.JSX.Element
> = {
  text: TextFieldRow,
  secret: SecretFieldRow,
  toggle: ToggleFieldRow,
  picker: PickerFieldRow,
};

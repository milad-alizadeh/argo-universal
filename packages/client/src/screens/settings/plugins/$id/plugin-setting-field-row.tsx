import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import type * as React from 'react';
import { Picker } from '#primitives/inputs/picker';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListSwitchItem } from '#primitives/lists/grouped-list-switch-item';
import { SecretRow, TextRow } from './plugin-text-rows';

export interface SettingFieldRowProps {
  field: PluginSettingField;
  settings: PluginSettings;
  onChange: (value: PluginSettingValue) => void;
}

const textTypes: ReadonlySet<PluginSettingField['type']> = new Set([
  'text',
  'secret',
]);

// One schema field as its own section: the kit row its type names, its description the footer.
export function SettingFieldRow(
  props: SettingFieldRowProps,
): React.JSX.Element {
  const { field } = props;
  const Row = fieldRows[field.type];

  return (
    <GroupedListSection
      footer={field.description}
      textFields={textTypes.has(field.type)}
    >
      <Row {...props} />
    </GroupedListSection>
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
    <GroupedListSwitchItem
      label={props.field.label}
      value={valueOf(props) === true}
      onValueChange={props.onChange}
    />
  );
}

function PickerFieldRow(props: SettingFieldRowProps): React.JSX.Element {
  return (
    <GroupedListItem
      label={props.field.label}
      accessory={<FieldPicker {...props} />}
    />
  );
}

function FieldPicker(props: SettingFieldRowProps): React.JSX.Element {
  const { field, onChange } = props;

  return (
    <Picker
      variant="row"
      label={field.label}
      value={textOf(valueOf(props))}
      options={field.type === 'picker' ? field.options : []}
      onValueChange={onChange}
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

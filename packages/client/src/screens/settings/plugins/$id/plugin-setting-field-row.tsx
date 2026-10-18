import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import type * as React from 'react';
import { useState } from 'react';
import { Picker } from '#primitives/inputs/picker';
import { TextInput } from '#primitives/inputs/text-input';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListSwitchItem } from '#primitives/lists/grouped-list-switch-item';

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
  const textFields = field.type === 'text' || field.type === 'secret';

  return (
    <GroupedListSection footer={field.description} textFields={textFields}>
      <FieldRow {...props} />
    </GroupedListSection>
  );
}

function FieldRow({
  field,
  settings,
  onChange,
}: SettingFieldRowProps): React.JSX.Element {
  const value = settings.values[field.key];

  switch (field.type) {
    case 'text':
      return (
        <TextRow
          key={typeof value === 'string' ? value : ''}
          label={field.label}
          hint={field.description}
          value={typeof value === 'string' ? value : ''}
          onSave={onChange}
        />
      );
    case 'secret':
      return (
        <SecretRow
          label={field.label}
          hint={field.description}
          set={settings.secretsSet.includes(field.key)}
          onSave={onChange}
        />
      );
    case 'toggle':
      return (
        <GroupedListSwitchItem
          label={field.label}
          value={value === true}
          onValueChange={onChange}
        />
      );
    case 'picker':
      return (
        <GroupedListItem
          label={field.label}
          accessory={
            <Picker
              variant="row"
              label={field.label}
              value={typeof value === 'string' ? value : undefined}
              options={field.options}
              onValueChange={onChange}
            />
          }
        />
      );
  }
}

type TextRowProps = {
  label: string;
  hint?: string;
  value: string;
  onSave: (value: string) => void;
};

// Saves when the field loses focus, and only a changed value: a quick Server write, so no spinner.
function TextRow({
  label,
  hint,
  value,
  onSave,
}: TextRowProps): React.JSX.Element {
  const [draft, setDraft] = useState(value);

  return (
    <TextInput
      variant="row"
      label={label}
      hint={hint}
      value={draft}
      onChangeText={setDraft}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
    />
  );
}

type SecretRowProps = Omit<TextRowProps, 'value'> & { set: boolean };

// A secret never comes back from the Server: the field starts empty, says whether one is saved, and a typed value replaces it.
function SecretRow({
  label,
  hint,
  set,
  onSave,
}: SecretRowProps): React.JSX.Element {
  const [draft, setDraft] = useState('');

  return (
    <TextInput
      variant="row"
      secure
      label={label}
      hint={hint}
      placeholder={set ? 'Saved in the Keychain' : 'Not set'}
      value={draft}
      onChangeText={setDraft}
      onBlur={() => {
        if (draft === '') return;
        onSave(draft);
        setDraft('');
      }}
    />
  );
}

import { useState } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import { Screen } from './index';

const themes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const projects = [
  'Alder',
  'Aspen',
  'Beech',
  'Birch',
  'Cedar',
  'Elm',
  'Maple',
  'Oak',
].map((name) => ({ value: name.toLowerCase(), label: name }));

function ProjectPicker(): React.JSX.Element {
  const [value, setValue] = useState('alder');

  return (
    <FieldGroup.Picker
      title="Project"
      options={projects}
      presentation="page"
      searchable
      value={value}
      onValueChange={setValue}
    />
  );
}

function ThemePicker(): React.JSX.Element {
  const [value, setValue] = useState('system');

  return (
    <FieldGroup.Picker
      title="Appearance"
      options={themes}
      presentation="menu"
      value={value}
      onValueChange={setValue}
    />
  );
}

function NotifyToggle(): React.JSX.Element {
  const [value, setValue] = useState(true);

  return (
    <FieldGroup.Toggle
      title="Notifications"
      value={value}
      onValueChange={setValue}
    />
  );
}

function NameField(): React.JSX.Element {
  const [value, setValue] = useState('Argo');

  return (
    <FieldGroup.TextField
      title="Name"
      placeholder="Name"
      value={value}
      onChangeText={setValue}
    />
  );
}

// A settings form in the stack, so a picker that presents as a page pushes onto it.
export function SettingsScreen(): React.JSX.Element {
  return (
    <Screen title="Settings">
      <FieldGroup>
        <FieldGroup.Section title="General">
          <ProjectPicker />
          <ThemePicker />
          <NotifyToggle />
          <NameField />
        </FieldGroup.Section>
      </FieldGroup>
    </Screen>
  );
}

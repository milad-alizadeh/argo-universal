import { useRouter } from 'expo-router';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { FieldGroup } from '#primitives/fields/field-group';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { useStackPush } from '#story-stack';
import { Screen } from './index';

export const onAction = fn();

const rows = ['Item one', 'Item two', 'Item three'];

function Rows(): React.JSX.Element {
  return (
    <List>
      <List.Section>
        {rows.map((title) => (
          <ListItem key={title} title={title} />
        ))}
      </List.Section>
    </List>
  );
}

// Two buttons and an overflow menu, whose last action is danger.
export function HeaderActionsScreen(): React.JSX.Element {
  return (
    <Screen title="Title" actions={<HeaderActions />}>
      <Rows />
    </Screen>
  );
}

function HeaderActions(): React.JSX.Element {
  return (
    <ActionList>
      <Action label="Filters" icon="filters" onPress={onAction} />
      <Action label="Archive" icon="archive" onPress={onAction} />
      <Action label="Copy link" icon="copy" onPress={onAction} />
      <Action label="Delete" icon="delete" tone="danger" onPress={onAction} />
    </ActionList>
  );
}

export function PushScreen(): React.JSX.Element {
  return (
    <Screen title="Title">
      <List>
        <List.Section>
          <OpenDetail />
        </List.Section>
      </List>
    </Screen>
  );
}

function OpenDetail(): React.JSX.Element {
  const push = useStackPush();

  return (
    <ListItem title="Open detail" disclosure onPress={() => push('detail')} />
  );
}

export function DetailScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <Screen title="Detail" onBack={() => router.back()}>
      <Rows />
    </Screen>
  );
}

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

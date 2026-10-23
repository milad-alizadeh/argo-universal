import { FieldGroup, Host, Picker } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { useStackPush } from '#story-stack';
import { Page } from './index';

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
export function HeaderActionsPage(): React.JSX.Element {
  return (
    <Page title="Title" actions={<HeaderActions />}>
      <Rows />
    </Page>
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

export function PushPage(): React.JSX.Element {
  return (
    <Page title="Title">
      <List>
        <List.Section>
          <OpenDetail />
        </List.Section>
      </List>
    </Page>
  );
}

function OpenDetail(): React.JSX.Element {
  const push = useStackPush();

  return (
    <ListItem title="Open detail" disclosure onPress={() => push('detail')} />
  );
}

export function DetailPage(): React.JSX.Element {
  const router = useRouter();

  return (
    <Page title="Detail" onBack={() => router.back()}>
      <Rows />
    </Page>
  );
}

const options = ['System', 'Light', 'Dark'];

// A settings form in the stack, so a picker that presents as a page pushes onto it.
export function SettingsPage(): React.JSX.Element {
  return (
    <Page title="Settings">
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="Appearance">
            <AppearancePicker />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </Page>
  );
}

function AppearancePicker(): React.JSX.Element {
  const [selected, setSelected] = useState('System');

  return (
    <Picker
      selectedValue={selected}
      onValueChange={(value) => setSelected(String(value))}
    >
      {options.map((label) => (
        <Picker.Item key={label} label={label} value={label} />
      ))}
    </Picker>
  );
}

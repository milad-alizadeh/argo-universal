import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { List } from '#primitives/lists/list';
import { ListItem } from './index';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem/Settings',
  component: ListItem,
  argTypes: kitArgTypes('ListItem'),
  args: { title: 'Settings' },
  parameters: { screenPreview: true },
} satisfies Meta<typeof ListItem>;

export default meta;

export const Settings: StoryObj<typeof meta> = {
  render: () => (
    <View testID="settings-reference" className="w-90 flex-1">
      <SettingsRows />
    </View>
  ),
};

/*
 * A row's description: under its title on desktop, web and Android, the rows staying in one card; on iOS a footer
 * that ends its group, so the rows after it start a new card.
 */
export const RowDescription: StoryObj<typeof meta> = {
  render: () => (
    <View className="w-90 flex-1">
      <List appearance="grouped" maxHeight={1000}>
        <SplitSection />
      </List>
    </View>
  ),
};

function SplitSection(): React.JSX.Element {
  return (
    <List.Section title="Section">
      <ListItem.Toggle
        title="Toggle"
        value
        onValueChange={action('toggle')}
        description="Description"
      />
      <PickerExample />
      <StepperExample />
    </List.Section>
  );
}

function SettingsRows(): React.JSX.Element {
  return (
    <List appearance="grouped" maxHeight={1000}>
      <List.Section>
        <LinkExample />
        <ToggleExample />
      </List.Section>
      <ControlSection />
      <FieldSection />
      <Actions />
    </List>
  );
}

function ToggleExample(): React.JSX.Element {
  const [value, onValueChange] = useState(true);

  return (
    <ListItem.Toggle
      title="Toggle"
      value={value}
      onValueChange={onValueChange}
      description="Description"
    />
  );
}

const themes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
];

function PickerExample(): React.JSX.Element {
  const [value, onValueChange] = useState('system');

  return (
    <ListItem.Picker
      title="Theme"
      value={value}
      options={themes}
      onValueChange={onValueChange}
    />
  );
}

function StepperExample(): React.JSX.Element {
  const [value, onValueChange] = useState(4);

  return (
    <ListItem.Stepper
      title="Count"
      value={value}
      min={1}
      max={8}
      onValueChange={onValueChange}
    />
  );
}

function FieldExample(): React.JSX.Element {
  const [value, onChangeText] = useState('Value');

  return (
    <ListItem.TextField
      label="Name"
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function Actions(): React.JSX.Element {
  return (
    <>
      <ActionSection title="Accent action" tone="accent" />
      <ActionSection title="Danger action" tone="danger" />
    </>
  );
}

function ActionSection(props: {
  title: string;
  tone: 'accent' | 'danger';
}): React.JSX.Element {
  return (
    <List.Section>
      <ListItem.Button {...props} onPress={action(props.title)} />
    </List.Section>
  );
}

function LinkExample(): React.JSX.Element {
  return (
    <ListItem.Link title="Link" value="Value" onPress={action('open link')} />
  );
}

function FieldSection(): React.JSX.Element {
  return (
    <List.Section>
      <FieldExample />
    </List.Section>
  );
}

function ControlSection(): React.JSX.Element {
  return (
    <List.Section>
      <PickerExample />
      <StepperExample />
    </List.Section>
  );
}

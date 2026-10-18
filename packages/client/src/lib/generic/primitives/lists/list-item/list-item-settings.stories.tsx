import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { List } from '#primitives/lists/list';
import { ListItem } from './index';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem/Settings',
  component: ListItem,
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

function SettingsRows(): React.JSX.Element {
  return (
    <List appearance="grouped" maxHeight={1000}>
      <List.Section>
        <ProjectLink />
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
      title="Fast mode"
      value={value}
      onValueChange={onValueChange}
      description="Use the Agent's faster model when it offers one."
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
      title="Max Sessions"
      value={value}
      min={1}
      max={8}
      onValueChange={onValueChange}
    />
  );
}

function FieldExample(): React.JSX.Element {
  const [value, onChangeText] = useState('Argo');

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
      <ActionSection title="Sign in to GitHub" tone="accent" />
      <ActionSection title="Remove Project" tone="danger" />
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

function ProjectLink(): React.JSX.Element {
  return (
    <ListItem.Link
      title="Project"
      value="Argo"
      onPress={action('open Project')}
    />
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

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { FieldGroup } from './field-group';

const meta = {
  title: 'Design System/Primitives/Forms/FieldGroup',
  component: FieldGroup,
  // The page holds each row's value, so the story renders it rather than these args.
  args: {},
  argTypes: kitArgTypes('FieldGroup'),
  parameters: { screenPreview: true },
  render: (): ReactElement => <SettingsScreen />,
} satisfies Meta<typeof FieldGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

// A whole page built from the rows, as a Settings screen: each section is an element, each row a kit component.
export const Settings: Story = {};

const onPress = fn();

function SettingsScreen(): ReactElement {
  return (
    <FieldGroup>
      {aboutSection}
      {choicesSection()}
      {removeSection}
    </FieldGroup>
  );
}

const aboutSection = (
  <FieldGroup.Section
    title="About"
    footer="Read-only values and rows that open a page."
  >
    <FieldGroup.Value title="Version" value="1.2.3" />
    <FieldGroup.Value title="Build" value="42" leading="settings" />
    <FieldGroup.Link title="Licences" onPress={onPress} />
    <FieldGroup.Link title="Privacy" leading="settings" onPress={onPress} />
  </FieldGroup.Section>
);

const removeSection = (
  <FieldGroup.Section>
    <Button label="Remove" variant="danger" onPress={onPress} />
  </FieldGroup.Section>
);

// Only sections need to be elements, so this is called, not rendered; its rows may be components of their own.
const choicesSection = (): ReactElement => (
  <FieldGroup.Section title="Choices">
    <NotificationsRow />
    <ChoiceRow />
    <NameRow />
  </FieldGroup.Section>
);

function NotificationsRow(): ReactElement {
  const [on, setOn] = useState(true);

  return (
    <FieldGroup.Toggle title="Notifications" value={on} onValueChange={setOn} />
  );
}

const options = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
];

function ChoiceRow(): ReactElement {
  const [choice, setChoice] = useState('two');

  return (
    <FieldGroup.Picker
      title="Choice"
      leading="settings"
      options={options}
      presentation="menu"
      value={choice}
      onValueChange={setChoice}
    />
  );
}

function NameRow(): ReactElement {
  const [name, setName] = useState('Argo');

  return (
    <FieldGroup.TextField
      title="Name"
      placeholder="Name"
      value={name}
      onChangeText={setName}
    />
  );
}

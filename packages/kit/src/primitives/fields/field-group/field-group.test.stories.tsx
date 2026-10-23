import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from './field-group';

const pressed = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldGroup',
  render: (): ReactElement => <Page />,
  beforeEach: (): void => {
    pressed.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ToggleFlips: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByLabelText('Notifications');
    await expect(toggle).toBeChecked();
    // Expo's web switch hides its input under the drawn track, so a press lands on the label.
    await userEvent.click(canvas.getByText('Notifications'));
    await expect(toggle).not.toBeChecked();
  },
};

export const LinkPresses: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('Licences'));
    await expect(pressed).toHaveBeenCalledTimes(1);
  },
};

export const TextFieldTypes: Story = {
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByDisplayValue('Argo');
    await userEvent.type(name, ' app');
    await expect(name).toHaveValue('Argo app');
  },
};

function Page(): ReactElement {
  const [on, setOn] = useState(true);
  const [name, setName] = useState('Argo');

  return (
    <FieldGroup>
      <FieldGroup.Section title="Page">
        <FieldGroup.Link title="Licences" onPress={pressed} />
        <FieldGroup.Toggle
          title="Notifications"
          value={on}
          onValueChange={setOn}
        />
        <FieldGroup.TextField
          title="Name"
          value={name}
          onChangeText={setName}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

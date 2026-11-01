import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { expect, fn } from 'storybook/test';
import { columnWidth, layoutWidths, settleLayout } from '#mocks/story-layout';
import { Screen } from '#primitives/scaffolds/screen';
import { FieldGroup } from './field-group';

const pressed = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldGroup',
  render: (): ReactElement => <Settings />,
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

// On a wide window the group's cards keep to the Screen's content column (#1748, #1702).
export const CardsKeepToColumnWide: Story = {
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout(layoutWidths.wide),
  render: (): ReactElement => (
    <Screen title="Accounts">
      <Settings />
    </Screen>
  ),
  play: async ({ canvas }) => {
    const first = canvas.getByText('Licences');
    const last = canvas.getByDisplayValue('Argo');
    let card: Element = first;

    // The nearest element holding every row of the section: the card.
    while (!card.contains(last) && card.parentElement)
      card = card.parentElement;
    const heading = canvas.getByRole('heading', { level: 1, name: 'Accounts' });

    await expect(
      card.getBoundingClientRect().right - heading.getBoundingClientRect().left,
    ).toBeLessThanOrEqual(columnWidth());
  },
};

function Settings(): ReactElement {
  const [on, setOn] = useState(true);
  const [name, setName] = useState('Argo');

  return (
    <FieldGroup>
      <FieldGroup.Section title="Screen">
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

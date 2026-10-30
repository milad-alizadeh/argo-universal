import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { Avatar } from '#primitives/content/avatar';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Media',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const person = (
  <Avatar
    testID="person"
    name="Sam Rivera"
    accessibilityLabel="Sam Rivera"
    status={{ tone: 'success' }}
  />
);

export const BadgeOwnsTheCorner: Story = {
  render: () => (
    <List layout="grid">
      <ListItem
        title="Assignee"
        badge={3}
        media={person}
        progress={{ value: 0.5 }}
      />
    </List>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('3')).toBeVisible();
    await expect(canvas.queryByTestId('person-status')).toBeNull();
    await expect(canvas.queryByRole('progressbar')).toBeNull();
  },
};

function PeopleSection(): React.JSX.Element {
  const [selection, onSelectionChange] = useState<readonly string[]>([]);

  return (
    <List layout="grid" columns="auto">
      <List.Section
        title="People"
        selectionMode="single"
        selection={selection}
        onSelectionChange={onSelectionChange}
      >
        <ListItem id="sam" title="Sam" media={person} />
        <ListItem id="morgan" title="Morgan" media={<Text>MC</Text>} />
      </List.Section>
    </List>
  );
}

export const SectionSelection: Story = {
  render: () => <PeopleSection />,
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('People')).toBeVisible();
    const morgan = await canvas.findByRole('button', { name: 'Morgan' });
    await userEvent.click(morgan);
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Morgan' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  },
};

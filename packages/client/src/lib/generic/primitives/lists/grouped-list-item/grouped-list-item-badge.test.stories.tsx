import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListItem } from './grouped-list-item';

const meta = {
  title: 'Tests/GroupedListItem/Badge',
  component: GroupedListItem,
  args: { label: 'Issues' },
  render: (args): React.JSX.Element => (
    <GroupedList>
      <GroupedListSection title="Tracker">
        <GroupedListItem {...args} />
      </GroupedListSection>
    </GroupedList>
  ),
} satisfies Meta<typeof GroupedListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// The row draws its count and says it with its name.
export const Count: Story = {
  args: { badge: 3 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Issues, 3' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('3')).toBeVisible();
  },
};

// Past 99 the badge shows 99+.
export const LargeCount: Story = {
  args: { badge: 120 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Issues, 99+' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('99+')).toBeVisible();
    await expect(canvas.queryByText('120')).not.toBeInTheDocument();
  },
};

// Nothing to count draws no badge.
export const NoCount: Story = {
  args: { badge: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Issues' }),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('0')).not.toBeInTheDocument();
  },
};

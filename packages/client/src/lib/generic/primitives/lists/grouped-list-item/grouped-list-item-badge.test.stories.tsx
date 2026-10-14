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

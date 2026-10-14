import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { DrawerItem } from './drawer-item';

const meta = {
  title: 'Tests/DrawerItem/Badge',
  component: DrawerItem,
  args: { label: 'Issues', icon: 'issue', selected: false, onPress: fn() },
} satisfies Meta<typeof DrawerItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// With no label of its own, the badge is announced as its count.
export const CountAsLabel: Story = {
  args: { badge: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('3')).toHaveTextContent('3');
  },
};

// A label the screen gives replaces the bare count.
export const OwnLabel: Story = {
  args: { badge: 3, badgeLabel: '3 need attention' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('3 need attention')).toHaveTextContent(
      '3',
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { DrawerItem } from './drawer-item';

const meta = {
  title: 'Design System/Primitives/Lists/DrawerItem',
  component: DrawerItem,
  args: {
    label: 'Inbox',
    icon: 'sessions',
    selected: false,
    onPress: action('select destination'),
  },
  // No Contracts schema: the props DrawerItemProps declares.
  argTypes: {
    label: { control: 'text' },
    icon: { control: false },
    selected: { control: 'boolean' },
    badge: { control: false },
    onPress: { control: false },
  },
  // A drawer's width, as the destination stands in the drawer.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-72">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof DrawerItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

export const NeedsAttention: Story = {
  args: { badge: { count: 2, label: '2 items need attention' } },
  parameters: {
    docs: { description: { story: 'A count of what needs attention.' } },
  },
};

export const OverNinetyNine: Story = {
  args: {
    label: 'Tasks',
    icon: 'issue',
    badge: { count: 120, label: '120 open items' },
  },
  parameters: {
    docs: {
      description: {
        story: 'More items than a badge shows, so the count reads 99+.',
      },
    },
  },
};

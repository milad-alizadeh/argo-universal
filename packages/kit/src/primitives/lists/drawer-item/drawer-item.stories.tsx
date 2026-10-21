import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { DrawerItem } from './drawer-item';
import {
  defaultDrawerItem,
  needsAttentionDrawerItem,
  overNinetyNineDrawerItem,
  selectedDrawerItem,
} from './drawer-item-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/DrawerItem',
  component: DrawerItem,
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

const onPress = action('select destination');

export const Default: Story = { args: { ...defaultDrawerItem, onPress } };

export const Selected: Story = { args: { ...selectedDrawerItem, onPress } };

export const NeedsAttention: Story = {
  args: { ...needsAttentionDrawerItem, onPress },
  parameters: {
    docs: { description: { story: 'A count of what needs attention.' } },
  },
};

export const OverNinetyNine: Story = {
  args: { ...overNinetyNineDrawerItem, onPress },
  parameters: {
    docs: {
      description: {
        story: 'More items than a badge shows, so the count reads 99+.',
      },
    },
  },
};

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { iconNames } from '#kit/symbols/icon-names';
import { IconButtonMenu } from './icon-button-menu';
import {
  disabledIconButtonMenu,
  secondaryIconButtonMenu,
} from './icon-button-menu-fixtures';

const meta = {
  title: 'Design System/Primitives/Actions/IconButtonMenu',
  component: IconButtonMenu,
  args: {
    actions: [
      { label: 'Action one', icon: 'camera', onPress: fn() },
      { label: 'Action two', icon: 'folder', onPress: fn() },
      { label: 'Action three', disabled: true, onPress: fn() },
    ],
  },
  // No Contracts schema: the props IconButtonMenuProps declares.
  argTypes: {
    icon: { control: 'select', options: iconNames },
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    control: { control: 'boolean' },
    disabled: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
    actions: { control: false },
  },
  // The button keeps its own width, as it sits in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full items-start">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof IconButtonMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Secondary: Story = { args: secondaryIconButtonMenu };

export const Disabled: Story = { args: disabledIconButtonMenu };

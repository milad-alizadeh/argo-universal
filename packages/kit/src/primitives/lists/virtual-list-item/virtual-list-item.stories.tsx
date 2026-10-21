import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { VirtualListItem } from './virtual-list-item';
import {
  firstInSectionVirtualListItem,
  lastInSectionVirtualListItem,
  loneRowVirtualListItem,
  middleOfSectionVirtualListItem,
  selectedRowVirtualListItem,
} from './virtual-list-item-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/VirtualListItem',
  component: VirtualListItem,
  // No Contracts schema: the props VirtualListItemProps declares.
  argTypes: {
    title: { control: 'text' },
    leading: { control: false },
    trailing: { control: false },
    position: {
      control: 'select',
      options: ['only', 'first', 'middle', 'last'],
    },
    selected: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
    onPress: { control: false },
    onLongPress: { control: false },
    testID: { control: 'text' },
  },
  /*
   * Each row of a virtualised list sits in a container of its own: one grouped card on iOS with inset separators,
   * Material's tiles 2 apart on Android, bare rows on a wide window.
   */
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full bg-content px-4 py-2 wide:w-frame-list wide:gap-0.5 wide:px-2">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof VirtualListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

const onPress = action('press row');

export const FirstInSection: Story = {
  args: { ...firstInSectionVirtualListItem, onPress },
};

export const MiddleOfSection: Story = {
  args: { ...middleOfSectionVirtualListItem, onPress },
};

export const LastInSection: Story = {
  args: { ...lastInSectionVirtualListItem, onPress },
};

export const SelectedRow: Story = {
  args: { ...selectedRowVirtualListItem, onPress },
  parameters: {
    docs: {
      description: { story: 'Wide only; a phone list has no selection.' },
    },
  },
};

export const LoneRow: Story = {
  args: { ...loneRowVirtualListItem, onPress },
  parameters: {
    docs: { description: { story: 'A lone row rounds every corner.' } },
  },
};

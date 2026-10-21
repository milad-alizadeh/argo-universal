import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { VirtualListItem } from './virtual-list-item';

const meta = {
  title: 'Design System/Primitives/Lists/VirtualListItem',
  component: VirtualListItem,
  args: {
    title: 'Item one',
    leading: <Icon role="body" name="agent" />,
    trailing: <Text role="row-detail">3/8</Text>,
    onPress: action('press row'),
  },
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

export const FirstInSection: Story = { args: { position: 'first' } };

export const MiddleOfSection: Story = {
  args: {
    title: 'Item two',
    trailing: <Text role="row-detail">12m</Text>,
    position: 'middle',
  },
};

export const LastInSection: Story = {
  args: {
    title: 'Item three',
    trailing: <Text role="row-detail">1h</Text>,
    position: 'last',
  },
};

export const SelectedRow: Story = {
  args: { position: 'first', selected: true },
  parameters: {
    docs: {
      description: { story: 'Wide only; a phone list has no selection.' },
    },
  },
};

export const LoneRow: Story = {
  args: {
    title: 'Item four',
    trailing: <Text role="row-detail">2h</Text>,
    position: 'only',
  },
  parameters: {
    docs: { description: { story: 'A lone row rounds every corner.' } },
  },
};

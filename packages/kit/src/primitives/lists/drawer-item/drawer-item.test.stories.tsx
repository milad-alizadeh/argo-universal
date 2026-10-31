import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { DrawerItem } from './drawer-item';
import { defaultDrawerItem } from './drawer-item-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/DrawerItem',
  component: DrawerItem,
  args: { ...defaultDrawerItem, onPress: fn() },
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

/*
 * A label taller than the row's minimum height, as an enlarged text size makes one, is not clipped: the row grows to
 * hold the whole of it. A label that wraps onto several lines stands for it.
 */
export const RowHoldsItsWholeLabel: Story = {
  args: {
    label:
      'A destination whose name is long enough to wrap onto several lines of the drawer',
  },
  play: async ({ canvas }) => {
    const row = canvas.getByRole('button').getBoundingClientRect();

    const label = canvas
      .getByText(/A destination whose name/)
      .getBoundingClientRect();

    await expect(row.height).toBeGreaterThanOrEqual(label.height);
    await expect(label.top).toBeGreaterThanOrEqual(row.top);
    await expect(label.bottom).toBeLessThanOrEqual(row.bottom);
  },
};

// A label of one line sits inside its row too.
export const ShortLabelSitsInsideTheRow: Story = {
  play: async ({ canvas }) => {
    const row = canvas.getByRole('button').getBoundingClientRect();
    const label = canvas.getByText('Inbox').getBoundingClientRect();

    await expect(label.top).toBeGreaterThanOrEqual(row.top);
    await expect(label.bottom).toBeLessThanOrEqual(row.bottom);
  },
};

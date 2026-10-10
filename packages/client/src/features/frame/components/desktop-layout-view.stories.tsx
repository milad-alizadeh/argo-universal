import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import {
  DesktopLayoutView,
  type DesktopLayoutViewProps,
} from './desktop-layout-view';
import { LayoutListMock } from './layout-list.mocks';

const meta = {
  title: 'Shell/DesktopLayoutView',
  component: DesktopLayoutView,
  parameters: { screenPreview: true },
  args: {
    destination: { to: 'sessions' },
    attentionCount: 1,
    // JSX in args breaks on-device Storybook's arg inference, so render draws the list and detail.
    list: null,
    children: null,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[600px] w-full">
      <DesktopLayoutView {...args} list={<LayoutListMock name="Sessions" />}>
        <View className="flex-1 p-4">
          <Text>Detail</Text>
        </View>
      </DesktopLayoutView>
    </View>
  ),
} satisfies Meta<DesktopLayoutViewProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'DesktopLayoutView' };

export const Destination: Story = {
  args: { destination: { to: 'settings-connection' } },
};

export const NoAttention: Story = { args: { attentionCount: 0 } };

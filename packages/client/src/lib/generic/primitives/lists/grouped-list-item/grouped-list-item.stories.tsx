import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { GroupedListItem } from './grouped-list-item';
import { GroupedRows } from './grouped-list-item-grouped-rows.mocks';
import { SidebarRows } from './grouped-list-item-sidebar-rows.mocks';

const meta = {
  title: 'Design System/Primitives/Lists/GroupedListItem',
  args: { label: 'Name' },
  component: GroupedListItem,
  parameters: { screenPreview: true },
} satisfies Meta<typeof GroupedListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <View className="flex-1 wide:flex-row">
      {/* Each group scrolls on a phone, so the three sidebar rows keep only their own height. */}
      <View className="flex-1">
        <GroupedRows />
      </View>
      <View className="h-60 wide:h-auto wide:flex-1">
        <SidebarRows />
      </View>
    </View>
  ),
};

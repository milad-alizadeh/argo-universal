import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { SidebarRows } from '../../../../../../mocks/list-item-mock';
import { ListItem } from './list-item';
import { GroupedRows } from './list-item-story-rows';

const meta = {
  title: 'Design System/Primitives/ListItem',
  args: { title: 'Name' },
  component: ListItem,
  parameters: { screenPreview: true },
} satisfies Meta<typeof ListItem>;
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

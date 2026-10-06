import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../primitives/text';
import { DesktopLayout } from './DesktopLayout';

const meta = {
  title: 'Shell/DesktopLayout',
  component: DesktopLayout,
  args: {
    destination: { to: 'sessions' },
    children: (
      <View className="flex-1 p-4">
        <Text>Detail</Text>
      </View>
    ),
  },
  render: (args) => (
    <View className="h-[600px] w-full">
      <DesktopLayout {...args} />
    </View>
  ),
} satisfies Meta<typeof DesktopLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Destination: Story = {
  args: { destination: { to: 'settings-connection' } },
};

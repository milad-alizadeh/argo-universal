import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../primitives/text';
import { DesktopLayout } from './desktop-layout';

const meta = {
  title: 'Shell/DesktopLayout',
  component: DesktopLayout,
  args: {
    destination: { to: 'sessions' },
    // JSX in args breaks on-device Storybook's arg inference, so render draws the detail.
    children: null,
  },
  render: (args) => (
    <View className="h-[600px] w-full">
      <DesktopLayout {...args}>
        <View className="flex-1 p-4">
          <Text>Detail</Text>
        </View>
      </DesktopLayout>
    </View>
  ),
} satisfies Meta<typeof DesktopLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Destination: Story = {
  args: { destination: { to: 'settings-connection' } },
};

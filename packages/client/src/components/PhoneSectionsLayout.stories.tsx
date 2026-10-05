import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '../primitives/text';
import { PhoneSectionsLayout } from './PhoneSectionsLayout';

const meta = {
  title: 'Shell/PhoneSectionsLayout',
  component: PhoneSectionsLayout,
  argTypes: {
    section: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
  },
  args: {
    section: 'sessions',
    children: (
      <View className="flex-1 p-6">
        <Text variant="muted">List</Text>
      </View>
    ),
  },
  render: (args) => (
    <View className="h-[796px] w-full">
      <PhoneSectionsLayout {...args} />
    </View>
  ),
} satisfies Meta<typeof PhoneSectionsLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Section: Story = { args: { section: 'settings' } };

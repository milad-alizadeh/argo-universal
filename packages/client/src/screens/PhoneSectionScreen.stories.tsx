import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { PhoneSectionScreen } from './PhoneSectionScreen';

const meta = {
  title: 'Shell/PhoneSectionScreen',
  component: PhoneSectionScreen,
  argTypes: {
    section: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
  },
  args: { section: 'sessions' },
  render: (args) => (
    <View className="h-[796px] w-full">
      <PhoneSectionScreen {...args} />
    </View>
  ),
} satisfies Meta<typeof PhoneSectionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Section: Story = { args: { section: 'settings' } };

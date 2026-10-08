import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { PhoneLayout } from '../components/phone-layout';
import { sectionDestination } from '../navigation/sections';
import { PhoneSectionScreen } from './phone-section-screen';

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
      <PhoneLayout destination={sectionDestination(args.section)}>
        <PhoneSectionScreen {...args} />
      </PhoneLayout>
    </View>
  ),
} satisfies Meta<typeof PhoneSectionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Section: Story = { args: { section: 'settings' } };

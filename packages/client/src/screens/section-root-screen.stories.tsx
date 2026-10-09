import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { sessionListMocks } from '../../mocks/session-list-mock';
import { SectionRootScreen } from './section-root-screen';

const meta = {
  title: 'screens/SectionRootScreen',
  component: SectionRootScreen,
  argTypes: {
    section: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
  },
  args: { section: 'sessions' },
  render: (args): React.JSX.Element => (
    <View className="h-[796px] w-full">
      <SectionRootScreen {...args} />
    </View>
  ),
  parameters: { trpc: sessionListMocks },
} satisfies Meta<typeof SectionRootScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Section: Story = { args: { section: 'settings' } };

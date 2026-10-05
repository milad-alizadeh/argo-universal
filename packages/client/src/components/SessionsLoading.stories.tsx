import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { SessionsLoading } from './SessionsLoading';

const meta = {
  title: 'Sessions/SessionsLoading',
  component: SessionsLoading,
  parameters: { previewPadding: false },
  render: () => (
    <View className="w-full bg-background wide:w-shell-list wide:bg-sidebar">
      <SessionsLoading />
    </View>
  ),
} satisfies Meta<typeof SessionsLoading>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'SessionsLoading' };

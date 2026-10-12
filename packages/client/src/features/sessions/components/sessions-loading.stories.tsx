import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { SessionsLoading } from './sessions-loading';

const meta = {
  title: 'Sessions/SessionsLoading',
  component: SessionsLoading,
  parameters: { previewPadding: false },
  render: (): React.JSX.Element => (
    <View className="w-full bg-sidebar wide:w-shell-list">
      <SessionsLoading />
    </View>
  ),
} satisfies Meta<typeof SessionsLoading>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'SessionsLoading' };

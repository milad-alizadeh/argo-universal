import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { SessionsLoading } from './sessions-loading';

const meta = {
  title: 'SessionList/SessionsLoading',
  component: SessionsLoading,
  parameters: { previewPadding: false },
  render: (): React.JSX.Element => (
    <View className="w-full bg-content wide:w-frame-list">
      <SessionsLoading />
    </View>
  ),
} satisfies Meta<typeof SessionsLoading>;

export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'SessionsLoading' };

export const Compact: StoryObj<typeof meta> = {
  name: 'SessionsLoading, Compact',
  render: (): React.JSX.Element => (
    <View className="w-full bg-content wide:w-frame-list">
      <SessionsLoading layout="compact" />
    </View>
  ),
};

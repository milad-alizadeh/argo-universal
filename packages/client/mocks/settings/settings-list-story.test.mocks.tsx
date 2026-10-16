import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SettingsList } from '../../src/features/settings/components/settings-list/settings-list';

export const meta = {
  title: 'Tests/SettingsList',
  component: SettingsList,
  args: {
    projectCount: 1,
    agentCount: 1,
    accountState: 'GitHub',
    deviceCount: 2,
    onSelect: fn(),
  },
  render: (args): React.JSX.Element => (
    <View className="h-175 w-full">
      <SettingsList {...args} />
    </View>
  ),
} satisfies Meta<typeof SettingsList>;

export type Story = StoryObj<typeof meta>;

export type PlayContext = Parameters<NonNullable<Story['play']>>[0];

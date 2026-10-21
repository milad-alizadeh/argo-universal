import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SettingsListView } from '../../src/screens/settings/settings-list/settings-list-view';

export const meta = {
  title: 'Tests/Screens/Settings',
  component: SettingsListView,
  args: {
    projectCount: 1,
    agentCount: 1,
    accountState: 'GitHub',
    deviceCount: 2,
    onSelect: fn(),
    onThemeChange: fn(),
  },
  render: (args): React.JSX.Element => (
    <View className="h-175 w-full">
      <SettingsListView {...args} />
    </View>
  ),
} satisfies Meta<typeof SettingsListView>;

export type Story = StoryObj<typeof meta>;

export type PlayContext = Parameters<NonNullable<Story['play']>>[0];

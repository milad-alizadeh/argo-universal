import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { SettingsList } from '../../src/features/settings/components/settings-list/settings-list';
import { createNavigationRecorder } from '../with-navigation-mocks';

export const recorder = createNavigationRecorder();
export const meta = {
  title: 'Tests/SettingsList',
  component: SettingsList,
  args: {
    projectCount: 1,
    agentCount: 1,
    accountState: 'GitHub',
    deviceCount: 2,
    onSelect: recorder.navigate,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[700px] w-full">
      <SettingsList {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: (): void => recorder.reset(),
} satisfies Meta<typeof SettingsList>;
export type Story = StoryObj<typeof meta>;
export type PlayContext = Parameters<NonNullable<Story['play']>>[0];

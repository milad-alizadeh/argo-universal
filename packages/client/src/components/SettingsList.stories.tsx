import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { settingsListMocks } from '../../mocks/settings-list-mock';
import type { NavigationDestination } from '../navigation/context';
import { Text } from '../primitives/text';
import { SettingsList } from './SettingsList';

const meta = {
  title: 'Settings/SettingsList',
  component: SettingsList,
  args: {
    ...settingsListMocks,
    serverName: "Milad's Mac mini",
    projectsNeedAttention: true,
    agentsNeedAttention: true,
    accountState: 'GitHub',
    deviceCount: 2,
    selectedDestination: { to: 'settings-accounts' },
    onSelect: action('select Settings page'),
  },
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Settings: Story = {
  render: function SettingsPreview(args) {
    const [selectedDestination, setSelectedDestination] = useState<
      NavigationDestination | undefined
    >(args.selectedDestination);
    return (
      <View
        className="w-full bg-background wide:w-shell-list wide:bg-sidebar"
        style={{ height: 480 }}
      >
        <View className="hidden h-14 flex-row items-center px-4 wide:flex">
          <Text
            role="heading"
            aria-level={1}
            className="text-base font-semibold"
          >
            Settings
          </Text>
        </View>
        <SettingsList
          {...args}
          selectedDestination={selectedDestination}
          onSelect={(destination) => {
            setSelectedDestination(destination);
            args.onSelect(destination);
          }}
        />
      </View>
    );
  },
};

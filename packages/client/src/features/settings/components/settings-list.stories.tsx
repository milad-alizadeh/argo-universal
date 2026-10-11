import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Text } from '#lib/generic/primitives/text';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { SettingsList } from './settings-list';
import { settingsListMocks } from './settings-list.mocks';

const meta = {
  title: 'Settings/SettingsList',
  component: SettingsList,
  parameters: { screenPreview: true },
  argTypes: {
    status: {
      options: ['ready', 'loading', 'disconnected'],
      control: { type: 'select' },
    },
  },
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
    const [selected, setSelected] = useState<NavigationDestination | undefined>(
      args.selectedDestination,
    );
    return (
      <View
        className="w-full bg-background wide:w-shell-list wide:bg-sidebar"
        style={{ flex: 1 }}
      >
        <View className="hidden h-14 flex-row items-center px-4 wide:flex">
          <Text
            semanticRole="heading"
            aria-level={1}
            className="text-base font-semibold"
          >
            Settings
          </Text>
        </View>
        <SettingsList
          {...args}
          selectedDestination={selected}
          onSelect={(destination) => {
            setSelected(destination);
            args.onSelect(destination);
          }}
        />
      </View>
    );
  },
};

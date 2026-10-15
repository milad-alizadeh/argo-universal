import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Text } from '#primitives/display/text';
import { SettingsList, type SettingsListProps } from './settings-list';
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
    projectsNeedAttention: true,
    agentsNeedAttention: true,
    accountState: 'GitHub',
    deviceCount: 2,
    selectedPath: '/settings/accounts',
    onSelect: action('select Settings page'),
  },
} satisfies Meta<typeof SettingsList>;

export default meta;

type Story = StoryObj<typeof meta>;

function SettingsHeading(): React.JSX.Element {
  return (
    <View className="hidden h-14 flex-row items-center px-4 wide:flex">
      <Text accessibilityRole="heading" aria-level={1} role={'heading'}>
        Settings
      </Text>
    </View>
  );
}

function useSelectedPage(
  args: SettingsListProps,
): Pick<SettingsListProps, 'selectedPath' | 'onSelect'> {
  const [selected, setSelected] = useState(args.selectedPath);

  return {
    selectedPath: selected,
    onSelect: (href) => {
      setSelected(href);
      args.onSelect(href);
    },
  };
}

function SettingsPreview(args: SettingsListProps): React.JSX.Element {
  const selection = useSelectedPage(args);

  return (
    <View className="w-full bg-content wide:w-frame-list" style={{ flex: 1 }}>
      <SettingsHeading />
      <SettingsList {...args} {...selection} />
    </View>
  );
}

export const Settings: Story = {
  render: (args) => <SettingsPreview {...args} />,
};

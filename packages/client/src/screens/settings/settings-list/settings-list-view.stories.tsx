import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Text } from '#primitives/content/text';
import {
  SettingsListView,
  type SettingsListViewProps,
} from './settings-list-view';
import { settingsListViewMocks } from './settings-list-view.mocks';

const meta = {
  title: 'Screens/Settings/Settings',
  component: SettingsListView,
  parameters: { screenPreview: true },
  argTypes: {
    status: {
      options: ['ready', 'loading', 'disconnected'],
      control: { type: 'select' },
    },
  },
  args: {
    ...settingsListViewMocks,
    projectsNeedAttention: true,
    accountState: 'GitHub',
    deviceCount: 2,
    selectedPath: '/settings/accounts',
    onSelect: action('select Settings page'),
  },
} satisfies Meta<typeof SettingsListView>;

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
  args: SettingsListViewProps,
): Pick<SettingsListViewProps, 'selectedPath' | 'onSelect'> {
  const [selected, setSelected] = useState(args.selectedPath);

  return {
    selectedPath: selected,
    onSelect: (href) => {
      setSelected(href);
      args.onSelect(href);
    },
  };
}

function SettingsPreview(args: SettingsListViewProps): React.JSX.Element {
  const selection = useSelectedPage(args);

  return (
    <View className="w-full bg-content wide:w-frame-list" style={{ flex: 1 }}>
      <SettingsHeading />
      <SettingsListView {...args} {...selection} />
    </View>
  );
}

export const Settings: Story = {
  render: (args) => <SettingsPreview {...args} />,
};

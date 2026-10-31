import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  SettingsListView,
  type SettingsListViewProps,
} from './settings-list-view';
import {
  disconnectedSettings,
  loadingSettings,
  pairedSettings,
  readySettings,
} from './settings-list-view-fixtures';

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
    ...readySettings,
    onSelect: action('select Settings page'),
    onThemeChange: action('choose theme'),
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

export const Loading: Story = { args: loadingSettings };

export const Disconnected: Story = { args: disconnectedSettings };

export const OnAPairedDevice: Story = { args: pairedSettings };

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { ShellList } from './shell-list';
import { endedShells, sessionShells, shellNow } from './shell-list.mocks';

const meta = {
  title: 'Sessions/ShellList',
  component: ShellList,
  parameters: { screenPreview: true },
  decorators: [
    (Story): JSX.Element => (
      <View className="w-full max-w-96">
        <Story />
      </View>
    ),
  ],
  args: {
    shells: sessionShells,
    onSelect: action('Open Shell output'),
    now: shellNow,
  },
} satisfies Meta<typeof ShellList>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "ShellList / Default": one running Shell, one passed and one failed.
export const Running: Story = {};

// Every way a Shell can end: exit 0, exit 1, stopped, exited without a code, and lost.
export const Ended: Story = { args: { shells: endedShells } };

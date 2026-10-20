import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import {
  failedOutput,
  failedShell,
  longRunningOutput,
  runningOutput,
  runningShell,
  shellNow,
} from './shell-list.mocks';
import { ShellOutput } from './shell-output';

const meta = {
  title: 'Sessions/ShellOutput',
  component: ShellOutput,
  parameters: { screenPreview: true },
  decorators: [
    (Story): JSX.Element => (
      <View className="h-150 w-full max-w-96">
        <Story />
      </View>
    ),
  ],
  args: { shell: runningShell, output: runningOutput, now: shellNow },
} satisfies Meta<typeof ShellOutput>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "ShellOutput (ios) / Running".
export const Running: Story = {};

// Long enough to scroll up from the end, where Jump to latest shows.
export const LongRunning: Story = {
  args: { output: longRunningOutput },
};

// Paper "ShellOutput (ios) / Exited": earlier lines dropped, then "Exit 1 after 8s".
export const Exited: Story = {
  args: { shell: failedShell, output: failedOutput },
};

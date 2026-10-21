import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { ShellOutput } from './shell-output';
import {
  exitedShellOutput,
  exitedWithoutACodeShellOutput,
  longRunningShellOutput,
  lostShellOutput,
  runningShellOutput,
  stoppedShellOutput,
} from './shell-output-fixtures';

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
  argTypes: { shell: { control: false }, output: { control: false } },
  args: runningShellOutput,
} satisfies Meta<typeof ShellOutput>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "ShellOutput (ios) / Running".
export const Running: Story = { args: runningShellOutput };

// Long enough to scroll up from the end, where Jump to latest shows.
export const LongRunning: Story = { args: longRunningShellOutput };

// Paper "ShellOutput (ios) / Exited": earlier lines dropped, then "Exit 1 after 8s".
export const Exited: Story = { args: exitedShellOutput };

// Paper "ShellOutput / Stopped": a stop glyph and how long it ran before you or the Agent killed it.
export const Stopped: Story = { args: stoppedShellOutput };

// Paper "ShellOutput / Exited, no code": a neutral footer with no glyph, since there is no code to report.
export const ExitedWithoutACode: Story = {
  args: exitedWithoutACodeShellOutput,
};

// Paper "ShellOutput / Lost": the Server restarted mid-run; the output it kept stays readable.
export const Lost: Story = { args: lostShellOutput };

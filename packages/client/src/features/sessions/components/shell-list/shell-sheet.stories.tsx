import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import {
  failedOutput,
  longRunningOutput,
  sessionShells,
  shellNow,
} from './shell-list.mocks';
import { ShellSheet } from './shell-sheet';

const meta = {
  title: 'Sessions/ShellSheet',
  component: ShellSheet,
  parameters: { screenPreview: true },
  args: {
    shells: sessionShells,
    open: true,
    onOpenChange: action('Close Shells'),
    onSelect: action('Open Shell output'),
    onStop: action('Stop Shell'),
    now: shellNow,
  },
} satisfies Meta<typeof ShellSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "ShellList (ios) / Default": one running, one passed, one failed. Open `pnpm dev` for the running output, `pnpm storybook` for the exited one.
export const Default: Story = {};

// The running Shell's output is long enough to scroll up from its end.
export const RunningOutput: Story = {
  args: { output: longRunningOutput },
};

export const ExitedOutput: Story = {
  args: { output: failedOutput },
};

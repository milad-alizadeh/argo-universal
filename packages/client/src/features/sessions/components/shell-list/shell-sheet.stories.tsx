import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { action } from 'storybook/actions';
import type { ShellEntry, ShellOutputText } from './shell-list-types';
import {
  failedOutput,
  longRunningOutput,
  sessionShells,
  shellNow,
} from './shell-list.mocks';
import { ShellSheet, type ShellSheetProps } from './shell-sheet';

// Each mock Shell's output, as the caller loads it when a row names the Shell.
const outputs = [longRunningOutput, failedOutput];

function LoadingShellSheet(props: ShellSheetProps): JSX.Element {
  const [output, setOutput] = useState<ShellOutputText>();

  const select = (shell: ShellEntry): void => {
    setOutput(outputs.find((output) => output.shellId === shell.id));
    props.onSelect?.(shell);
  };

  return <ShellSheet {...props} output={output} onSelect={select} />;
}

const meta = {
  title: 'Sessions/ShellSheet',
  component: ShellSheet,
  parameters: { screenPreview: true },
  render: (args): JSX.Element => <LoadingShellSheet {...args} />,
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

// Paper "ShellList (ios) / Default": one running, one passed, one failed. Open `pnpm dev` for the running output (scroll up for Jump to latest), `pnpm storybook` for the exited one.
export const Default: Story = {};

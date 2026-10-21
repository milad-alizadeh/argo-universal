import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { action } from 'storybook/actions';
import { runningShells } from './shell-list-fixtures';
import type { ShellEntry, ShellOutputText } from './shell-list-types';
import { failedOutput, longRunningOutput } from './shell-output.mocks';
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
  // Its inherited props come from shell-list-types.ts, which react-docgen cannot follow.
  argTypes: {
    shells: {
      control: false,
      description: 'The Session\u2019s background Shells.',
    },
    output: {
      control: false,
      description:
        'The open Shell\u2019s output; the caller loads it when `onSelect` names the Shell.',
    },
    onOpenChange: { control: false },
    onSelect: {
      control: false,
      description: 'Opens that Shell\u2019s output.',
    },
    onStop: { control: false, description: 'Stops that Shell.' },
    now: { description: 'Fixed time for stories and tests.' },
  },
  args: {
    ...runningShells,
    open: true,
    onOpenChange: action('Close Shells'),
    onSelect: action('Open Shell output'),
    onStop: action('Stop Shell'),
  },
} satisfies Meta<typeof ShellSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "ShellList (ios) / Default": one running, one passed, one failed. Open `pnpm dev` for the running output (scroll up for Jump to latest), `pnpm storybook` for the exited one.
export const Default: Story = {};

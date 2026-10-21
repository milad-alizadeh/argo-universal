import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import type { ShellEntry, ShellOutputText } from './shell-list-types';
import { sessionShells, shellNow } from './shell-list.mocks';
import {
  failedOutput,
  longRunningOutput,
  lostOutput,
  noCodeOutput,
  stoppedOutput,
} from './shell-output.mocks';
import { ShellPanel, type ShellPanelProps } from './shell-panel';

// Each mock Shell's output, as the caller loads it when a row names the Shell.
const outputs = [
  longRunningOutput,
  failedOutput,
  stoppedOutput,
  noCodeOutput,
  lostOutput,
];

function LoadingShellPanel(props: ShellPanelProps): JSX.Element {
  const [output, setOutput] = useState<ShellOutputText>();

  const select = (shell: ShellEntry): void => {
    setOutput(outputs.find((one) => one.shellId === shell.id));
    props.onSelect?.(shell);
  };

  return <ShellPanel {...props} output={output} onSelect={select} />;
}

const meta = {
  title: 'Sessions/ShellPanel',
  component: ShellPanel,
  parameters: { screenPreview: true },
  decorators: [
    (Story): JSX.Element => (
      <View className="h-150 w-full max-w-96">
        <Story />
      </View>
    ),
  ],
  render: (args): JSX.Element => <LoadingShellPanel {...args} />,
  args: {
    shells: sessionShells,
    onSelect: action('Open Shell output'),
    onStop: action('Stop Shell'),
    now: shellNow,
  },
} satisfies Meta<typeof ShellPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "Components / Shell", Desktop column: the list, and a row opens that Shell's output under its own header.
export const Shells: Story = { name: 'ShellPanel' };

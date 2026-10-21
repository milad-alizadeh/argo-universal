import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { ShellList } from './shell-list';
import { endedShells, runningShells } from './shell-list-fixtures';

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
  /*
   * ShellListProps is declared in shell-list-types.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    shells: {
      control: false,
      description:
        'The Session\u2019s background Shells, in the order the Agent started them.',
    },
    onSelect: {
      control: false,
      description: 'Opens that Shell\u2019s output.',
    },
    now: {
      description:
        'Fixed time for stories and tests; a running Shell\u2019s time otherwise ticks.',
    },
  },
  args: { ...runningShells, onSelect: action('Open Shell output') },
} satisfies Meta<typeof ShellList>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "ShellList / Default": one running Shell, one passed and one failed.
export const Running: Story = { args: runningShells };

// Every way a Shell can end: exit 0, exit 1, stopped, exited without a code, and lost.
export const Ended: Story = { args: endedShells };

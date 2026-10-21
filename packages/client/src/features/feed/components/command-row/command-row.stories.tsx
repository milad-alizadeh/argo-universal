import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CommandRow } from './command-row';
import {
  completedCommandRow,
  failedCommandRow,
  runningCommandRow,
  stoppedCommandRow,
} from './command-row-fixtures';

const meta = {
  title: 'Feed/CommandRow',
  component: CommandRow,
  argTypes: {
    row: { control: false },
    initialOpen: { control: 'boolean' },
    now: { control: 'number' },
    awaitingApproval: { control: 'boolean' },
  },
  args: completedCommandRow,
} satisfies Meta<typeof CommandRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * One story per outcome the command state reads. No story for a command waiting on your
 * approval: no recording holds one, and a fixture may not invent it.
 */

// Still running: the header counts up and the footer reads Running.
export const Running: Story = { args: runningCommandRow };

// Settled at exit 0, with its Shell output open.
export const Completed: Story = { args: completedCommandRow };

// A non-zero exit reads red, in the header and beside the footer's cross.
export const Failed: Story = { args: failedCommandRow };

// You stopped the command, so it settles on Stopped with no outcome mark.
export const Stopped: Story = { args: stoppedCommandRow };

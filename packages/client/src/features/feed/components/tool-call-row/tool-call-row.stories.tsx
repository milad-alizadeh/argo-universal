import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolCallRow } from './tool-call-row';
import { completedToolCall, runningToolCall } from './tool-call-row-fixtures';

const meta = {
  title: 'Feed/ToolCallRow',
  component: ToolCallRow,
  argTypes: {
    row: { control: false },
    initialOpen: { control: 'boolean' },
    awaitingApproval: { control: 'boolean' },
  },
  args: completedToolCall,
} satisfies Meta<typeof ToolCallRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * No story for a failed or stopped read: the recordings hold neither, and the settled
 * label it would add is one line of the row's own output.
 */

// Still running: the title reads in the present and the row marks itself as working.
export const Running: Story = { args: runningToolCall };

// Settled: the title reads in the past and the row opens on its output.
export const Completed: Story = { args: completedToolCall };

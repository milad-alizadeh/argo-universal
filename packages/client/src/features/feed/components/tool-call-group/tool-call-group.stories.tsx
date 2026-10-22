import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolCallGroup } from './tool-call-group';
import {
  allowedOnceGroup,
  awaitingApprovalGroup,
  parallelGroup,
  runningGroup,
  settledGroup,
} from './tool-call-group-fixtures';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Feed/ToolCallGroup',
  component: ToolCallGroup,
  argTypes: {
    group: { control: false },
    renderActivity: { control: false },
    initialOpen: { control: 'boolean' },
    now: { control: 'number' },
  },
  args: { ...settledGroup, renderActivity: renderRecordedActivity },
} satisfies Meta<typeof ToolCallGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

// Still running: the live Tool call heads the group and the duration counts up.
export const Running: Story = { args: runningGroup };

// Parallel calls: the live command heads the group while the read it overlaps stays in the list.
export const Parallel: Story = { args: parallelGroup };

// Settled: the group's own title heads it, with no duration.
export const Settled: Story = { args: settledGroup };

// The Tool call waits for a permission answer.
export const AwaitingApproval: Story = { args: awaitingApprovalGroup };

// The permission was answered with Allow once.
export const AllowedOnce: Story = { args: allowedOnceGroup };

import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { toolCallGroupMock } from '../tool-call.mocks';
import { ToolCallGroup } from './tool-call-group';
import { awaitingApprovalGroup } from './tool-call-group-fixtures';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Tests/Feed/ToolCallGroup/Orb',
  component: ToolCallGroup,
  args: {
    group: toolCallGroupMock.running,
    renderActivity: renderRecordedActivity,
    now: toolCallGroupMock.now,
  },
} satisfies Meta<typeof ToolCallGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const orbNames = /^(Working|Searching|Solving|Listening|Composing|Shaping)$/;

// The recorded group runs a command, which moves the Orb as Shaping.
export const RunningCommand: Story = {
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByRole('img', { name: 'Shaping' })).toBeVisible();
  },
};

// A group waiting on a Permission request keeps its Tool's icon, not an Orb.
export const AwaitingApproval: Story = {
  args: awaitingApprovalGroup,
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByText('Awaiting approval')).toBeVisible();
    await expect(
      canvas.queryByRole('img', { name: orbNames }),
    ).not.toBeInTheDocument();
  },
};

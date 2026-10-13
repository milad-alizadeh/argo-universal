import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { runningRead, toolCallGroupMock } from '../tool-call.mocks';
import { ToolCallGroup } from './tool-call-group';
import {
  dark,
  parallelCase,
  readFileTitle,
  runningReadNow,
} from './tool-call-group-play.mocks';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Tests/ToolCallGroup',
  component: ToolCallGroup,
  args: {
    group: toolCallGroupMock.group,
    renderActivity: renderRecordedActivity,
    now: toolCallGroupMock.now,
  },
} satisfies Meta<typeof ToolCallGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

function parallelCalls(width: number, agentIndex: number): Story {
  const { recorded, expectedTitle, read } = parallelCase(agentIndex);
  return {
    args: { group: recorded.parallel, now: recorded.now },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const header = canvas.getByRole('button', { name: expectedTitle });
      await expect(header).toBeVisible();
      await expect(header).toHaveTextContent('23s');
      await expect(header).not.toHaveTextContent(recorded.later.title);
      await userEvent.click(header);
      await expect(
        canvas.getAllByRole('button', { name: expectedTitle }),
      ).toHaveLength(1);
      await expect(
        canvas.getByRole('button', { name: `Read ${read}` }),
      ).toBeVisible();
    },
  };
}
export const ParallelCallsPhoneFirstAgent = parallelCalls(
  layoutWidths.phone,
  0,
);
export const ParallelCallsPhoneSecondAgent = parallelCalls(
  layoutWidths.phone,
  1,
);
export const ParallelCallsWideFirstAgent = parallelCalls(layoutWidths.wide, 0);
export const ParallelCallsWideSecondAgent = parallelCalls(layoutWidths.wide, 1);

function runningReadGroup(width: number): Story {
  return {
    args: {
      group: {
        ...toolCallGroupMock.running,
        state: 'open',
        live: { toolCall: runningRead, awaitingApproval: false },
        items: [{ ...toolCallGroupMock.exploration, toolCalls: [runningRead] }],
      },
      now: runningReadNow,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const header = canvas.getByRole('button', {
        name: readFileTitle,
      });
      await expect(header).toHaveTextContent('Read /project/hello.txt 23s');
      await userEvent.click(header);
      await expect(
        canvas.getAllByRole('button', { name: readFileTitle }),
      ).toHaveLength(1);
      await expect(canvas.queryByText('hello.txt', { exact: true })).toBeNull();
    },
  };
}
export const RunningReadPhone = runningReadGroup(layoutWidths.phone);
export const RunningReadWide = runningReadGroup(layoutWidths.wide);

export const RunningReadPhoneDark: Story = { ...RunningReadPhone, ...dark };
export const RunningReadWideDark: Story = { ...RunningReadWide, ...dark };

import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { runningRead, toolCallGroupMock } from '../tool-call.mocks';
import { ToolCallGroup } from './tool-call-group';
import {
  commandAndFileSummary,
  dark,
  parallelCase,
  readFileTitle,
  runningReadNow,
} from './tool-call-group-play.mocks';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Tests/Feed/ToolCallGroup/Live',
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
      await settleLayout(width);
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
      await settleLayout(width);

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

const movingTempDirectory = 'Moving temp directory';

function liveHeaderGroup(width: number): Story {
  return {
    args: {
      group: {
        ...toolCallGroupMock.running,
        state: 'open',
        liveHeader: {
          text: movingTempDirectory,
          source: { type: 'thought' },
          startedAt: runningReadNow - 97_000,
        },
      },
      now: runningReadNow,
    },
    play: async ({ canvas }) => {
      await settleLayout(width);

      const header = canvas.getByRole('button', {
        name: `${movingTempDirectory} 1m 37s`,
      });

      await expect(header).toBeVisible();
      await expect(canvas.queryByRole('status')).toBeNull();
    },
  };
}

export const LiveHeaderTitlePhone = liveHeaderGroup(layoutWidths.phone);

export const LiveHeaderTitleWide = liveHeaderGroup(layoutWidths.wide);

const creatingConfig = 'Creating empty config';

/*
 * The Session row's activity line is the live header, so a group whose Tool calls
 * have settled while the Turn runs says the same line rather than its summary (#1410).
 */
function settledGroupLiveHeader(width: number): Story {
  return {
    args: {
      group: {
        ...toolCallGroupMock.group,
        liveHeader: {
          text: creatingConfig,
          source: { type: 'tool_call', toolCallId: runningRead.toolCallId },
          startedAt: runningReadNow - 97_000,
        },
      },
      now: runningReadNow,
    },
    play: async ({ canvas }) => {
      await settleLayout(width);

      await expect(
        canvas.getByRole('button', { name: `${creatingConfig} 1m 37s` }),
      ).toBeVisible();
      await expect(canvas.queryByText(commandAndFileSummary)).toBeNull();
    },
  };
}

export const SettledGroupLiveHeaderPhone = settledGroupLiveHeader(
  layoutWidths.phone,
);

export const SettledGroupLiveHeaderWide = settledGroupLiveHeader(
  layoutWidths.wide,
);

import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { runningRead, toolCallGroupMock } from '../tool-call.mocks';
import { ToolCallGroup } from './tool-call-group';
import {
  commandAndFileSummary,
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

function parallelCalls(agentIndex: number): Story {
  const { recorded, expectedTitle, read } = parallelCase(agentIndex);

  return {
    args: { group: recorded.parallel, now: recorded.now },
    play: async ({ canvas, userEvent }) => {
      await settleLayout('phone');
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

export const ParallelCallsFirstAgent = parallelCalls(0);

export const ParallelCallsSecondAgent = parallelCalls(1);

export const RunningRead: Story = {
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
    await settleLayout('phone');

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

const movingTempDirectory = 'Moving temp directory';

export const LiveHeaderTitle: Story = {
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
    await settleLayout('phone');

    const header = canvas.getByRole('button', {
      name: `${movingTempDirectory} 1m 37s`,
    });

    await expect(header).toBeVisible();
    await expect(canvas.queryByRole('status')).toBeNull();
  },
};

const creatingConfig = 'Creating empty config';

/*
 * A group whose Tool calls have settled while the Turn runs says the live header
 * rather than its summary, so the Feed never shows two different lines (#1410).
 */
export const SettledGroupLiveHeader: Story = {
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
    await settleLayout('phone');

    await expect(
      canvas.getByRole('button', { name: `${creatingConfig} 1m 37s` }),
    ).toBeVisible();
    await expect(canvas.queryByText(commandAndFileSummary)).toBeNull();
  },
};

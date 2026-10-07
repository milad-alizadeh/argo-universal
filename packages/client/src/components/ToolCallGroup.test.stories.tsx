import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { expectShimmerMovement } from '../../mocks/expect-shimmer';
import { settleViewport } from '../../mocks/settle-viewport';
import { renderRecordedActivity } from '../../mocks/tool-call-group-preview';
import {
  runningRead,
  toolCallGroupMock,
  toolCallGroupMocks,
} from '../../mocks/tool-call-mock';
import { ToolCallGroup } from './ToolCallGroup';

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

function settled(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const group = canvas.getByRole('button', {
        name: 'Ran 1 command, Read 1 file',
      });
      await expect(group).toBeVisible();
      await expect(within(group).queryByText('0.3s')).not.toBeInTheDocument();
      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Read /project/hello.txt' }),
      ).toBeVisible();
      await expect(
        canvas.getAllByRole('button', {
          name: 'Show hello.txt and short git status',
        }),
      ).toHaveLength(1);
      await userEvent.click(group);
      await waitFor(() =>
        expect(
          canvas.queryAllByRole('button', { name: /^Read / }),
        ).toHaveLength(0),
      );
    },
  };
}
export const SettledPhone = settled(layoutWidths.phone);
export const SettledWide = settled(layoutWidths.wide);

function running(width: number): Story {
  return {
    args: { group: toolCallGroupMock.running },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const group = canvas.getByRole('button', {
        name: 'Show hello.txt and short git status',
      });
      await expect(group).toBeVisible();
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expectShimmerMovement(group, '23s');
      await expect(group.querySelectorAll('svg')).toHaveLength(2);
      await expect(group).toHaveTextContent('short git status 23s');
      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Read /project/hello.txt' }),
      ).toBeVisible();
      await expect(
        canvas.getAllByRole('button', {
          name: 'Show hello.txt and short git status',
        }),
      ).toHaveLength(1);
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await userEvent.click(group);
      await waitFor(() =>
        expect(
          canvas.queryAllByRole('button', { name: /^Read / }),
        ).toHaveLength(0),
      );
    },
  };
}
export const RunningPhone = running(layoutWidths.phone);
export const RunningWide = running(layoutWidths.wide);

function parallelCalls(width: number, agentIndex: number): Story {
  const recorded = toolCallGroupMocks[agentIndex];
  if (!recorded)
    throw new Error(
      'Recorded catalog needs parallel Tool calls for both Agents',
    );
  const expectedTitle =
    recorded.earlier.title ===
    recorded.earlier.content.find((content) => content.type === 'terminal')
      ?.command
      ? 'Running command'
      : recorded.earlier.title;
  const read =
    recorded.later._meta?.argo?.commandActions?.find(
      (action) => action.type === 'read',
    )?.path ?? recorded.later.locations?.[0]?.path;
  if (!read) throw new Error('Recorded catalog needs a completed read path');
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

export const OpenCompletedHistory: Story = {
  args: { group: { ...toolCallGroupMock.group, state: 'open' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Ran 1 command, Read 1 file',
      }),
    );
    await expect(
      canvas.getAllByRole('button', {
        name: 'Show hello.txt and short git status',
      }),
    ).toHaveLength(1);
  },
};

function agentParity(width: number): Story {
  return {
    render: (args) => (
      <>
        {toolCallGroupMocks.map(({ agent, group }) => (
          <ToolCallGroup {...args} key={agent} group={group} />
        ))}
      </>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const groups = canvas.getAllByRole('button', {
        name: 'Ran 1 command, Read 1 file',
      });
      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);
      for (const group of groups) await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Read /project/hello.txt' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Read /repo/app.txt' }),
      ).toBeVisible();
      await expect(canvas.queryByText('Explored')).not.toBeInTheDocument();
      for (const group of groups) await userEvent.click(group);
      await waitFor(() =>
        expect(
          canvas.queryAllByRole('button', { name: /^Read / }),
        ).toHaveLength(0),
      );
    },
  };
}
export const AgentParityPhone = agentParity(layoutWidths.phone);
export const AgentParityWide = agentParity(layoutWidths.wide);

function runningReadGroup(width: number): Story {
  return {
    args: {
      group: {
        ...toolCallGroupMock.running,
        state: 'open',
        live: { toolCall: runningRead, awaitingApproval: false },
        items: [{ ...toolCallGroupMock.exploration, toolCalls: [runningRead] }],
      },
      now: (runningRead._meta?.argo?.startedAt ?? 0) + 23000,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const header = canvas.getByRole('button', {
        name: 'Read /project/hello.txt',
      });
      await expect(header).toHaveTextContent('Read /project/hello.txt 23s');
      await userEvent.click(header);
      await expect(
        canvas.getAllByRole('button', { name: 'Read /project/hello.txt' }),
      ).toHaveLength(1);
      await expect(canvas.queryByText('hello.txt', { exact: true })).toBeNull();
    },
  };
}
export const RunningReadPhone = runningReadGroup(layoutWidths.phone);
export const RunningReadWide = runningReadGroup(layoutWidths.wide);

export const SettledPhoneDark: Story = {
  ...SettledPhone,
  globals: { mode: 'dark' },
};
export const SettledWideDark: Story = {
  ...SettledWide,
  globals: { mode: 'dark' },
};
export const RunningPhoneDark: Story = {
  ...RunningPhone,
  globals: { mode: 'dark' },
};
export const RunningWideDark: Story = {
  ...RunningWide,
  globals: { mode: 'dark' },
};
export const AgentParityPhoneDark: Story = {
  ...AgentParityPhone,
  globals: { mode: 'dark' },
};
export const AgentParityWideDark: Story = {
  ...AgentParityWide,
  globals: { mode: 'dark' },
};
export const RunningReadPhoneDark: Story = {
  ...RunningReadPhone,
  globals: { mode: 'dark' },
};
export const RunningReadWideDark: Story = {
  ...RunningReadWide,
  globals: { mode: 'dark' },
};

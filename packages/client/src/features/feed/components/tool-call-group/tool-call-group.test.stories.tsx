import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import type { FeedGroup } from '../../view/feed-view';
import { FeedItem } from '../feed-item';
import { scriptedToolCall } from '../tool-call-description.mocks';
import { toolCallGroupMock, toolCallGroupMocks } from '../tool-call.mocks';
import { ToolCallGroup } from './tool-call-group';
import {
  commandAndFileSummary,
  commandTitle,
  dark,
  readFileTitle,
} from './tool-call-group-play.mocks';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Tests/Feed/ToolCallGroup',
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
      await settleLayout(width);

      const group = canvas.getByRole('button', {
        name: commandAndFileSummary,
      });

      await expect(group).toBeVisible();
      await expect(within(group).queryByText('0.3s')).not.toBeInTheDocument();
      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: readFileTitle }),
      ).toBeVisible();
      await expect(
        canvas.getAllByRole('button', {
          name: commandTitle,
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
      await settleLayout(width);

      const group = canvas.getByRole('button', {
        name: commandTitle,
      });

      await expect(group).toBeVisible();
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expect(group).toHaveTextContent('short git status 23s');
      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: readFileTitle }),
      ).toBeVisible();
      await expect(
        canvas.getAllByRole('button', {
          name: commandTitle,
        }),
      ).toHaveLength(1);
      await expect(canvas.getByText('Shell')).toBeVisible();
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

export const OpenCompletedHistory: Story = {
  args: { group: { ...toolCallGroupMock.group, state: 'open' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', {
        name: commandAndFileSummary,
      }),
    );
    await expect(
      canvas.getAllByRole('button', {
        name: commandTitle,
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
      await settleLayout(width);

      const groups = canvas.getAllByRole('button', {
        name: commandAndFileSummary,
      });

      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);

      for (const group of groups) await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: readFileTitle }),
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

export const SettledPhoneDark: Story = { ...SettledPhone, ...dark };

export const SettledWideDark: Story = { ...SettledWide, ...dark };

export const RunningPhoneDark: Story = { ...RunningPhone, ...dark };

export const RunningWideDark: Story = { ...RunningWide, ...dark };

export const AgentParityPhoneDark: Story = { ...AgentParityPhone, ...dark };

export const AgentParityWideDark: Story = { ...AgentParityWide, ...dark };

const editDescription = 'Updating the greeting';

function activeEditGroup(
  withHeader: boolean,
  toolCallId = 'edit-title',
): FeedGroup {
  const row = scriptedToolCall(toolCallId);

  const group: FeedGroup = {
    type: 'group',
    id: row.id,
    title: 'Working',
    state: 'open',
    items: [{ type: 'tool_call', row }],
    live: { toolCall: row, awaitingApproval: false },
  };

  if (withHeader)
    group.liveHeader = {
      text: 'Working',
      startedAt: null,
      source: { type: 'working' },
    };

  return group;
}

// A running edit keeps its Agent description above the file disclosure in a live-header group.
export const RunningEditWithLiveHeader: Story = {
  render: () => <FeedItem item={activeEditGroup(true)} imageUrl={() => ''} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(canvas.getByRole('button', { name: /Working/ }));
    await expect(canvas.getByText(editDescription)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: /Edited hello.txt/ }),
    ).toBeVisible();
  },
};

// Without a Live header the group names the edit once, while its file remains available below.
export const RunningEditWithoutLiveHeader: Story = {
  render: () => <FeedItem item={activeEditGroup(false)} imageUrl={() => ''} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: /Updating the greeting/ }),
    );
    await expect(
      canvas.getAllByText(editDescription, {
        exact: false,
      }),
    ).toHaveLength(1);
    await expect(
      canvas.getByRole('button', { name: /Edited hello.txt/ }),
    ).toBeVisible();
  },
};

export const RunningEditWithoutDescription: Story = {
  render: () => (
    <FeedItem
      item={activeEditGroup(true, 'edit-empty-title')}
      imageUrl={() => ''}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(canvas.getByRole('button', { name: /Working/ }));
    await expect(canvas.getByText('Editing file')).toBeVisible();
  },
};

// A descriptive ACP edit title remains visible alongside its diff.
export const RunningEditWithAgentDescription: Story = {
  render: () => (
    <FeedItem
      item={activeEditGroup(true, 'edit-described')}
      imageUrl={() => ''}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(canvas.getByRole('button', { name: /Working/ }));
    await expect(canvas.getByText('Correcting the greeting')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: /Edited hello.txt/ }),
    ).toBeVisible();
  },
};

// A live command's group disclosure opens its output without repeating its description.
export const RunningCommandShowsOutput: Story = {
  render: () => {
    const row = scriptedToolCall('described-running');

    const group: FeedGroup = {
      type: 'group',
      id: row.id,
      title: 'Working',
      state: 'open',
      items: [{ type: 'tool_call', row }],
      live: { toolCall: row, awaitingApproval: false },
    };

    return <FeedItem item={group} imageUrl={() => ''} />;
  },
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: /Checking the working tree/ }),
    );
    await expect(
      canvas.getAllByText('Checking the working tree', {
        exact: false,
      }),
    ).toHaveLength(1);
    await expect(canvas.getByText('Shell')).toBeVisible();
  },
};

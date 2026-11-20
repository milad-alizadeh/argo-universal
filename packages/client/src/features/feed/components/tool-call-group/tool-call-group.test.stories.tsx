import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import type { FeedGroup } from '../../view/feed-view';
import { FeedItem } from '../feed-item';
import { scriptedToolCall } from '../tool-call-description.mocks';
import {
  failedCommand,
  toolCallGroupMock,
  toolCallGroupMocks,
} from '../tool-call.mocks';
import { ToolCallGroup } from './tool-call-group';
import {
  failedCommandsGroup,
  allowedOnceHeaderGroup,
} from './tool-call-group-fixtures';
import {
  commandAndFileSummary,
  commandLine,
  readFileTitle,
  runningGroupTitle,
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

export const Settled: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

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
      canvas.getAllByRole('button', { name: commandLine }),
    ).toHaveLength(1);
    await userEvent.click(group);
    await waitFor(() =>
      expect(canvas.queryAllByRole('button', { name: /^Read / })).toHaveLength(
        0,
      ),
    );
  },
};

export const Running: Story = {
  args: { group: toolCallGroupMock.running },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    // The newest running call titles the group even behind a read, as Codex titles its active cell.
    const group = canvas.getByRole('button', { name: runningGroupTitle });

    await expect(group).toBeVisible();
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
    await expect(group).toHaveTextContent(`${runningGroupTitle} 23s`);
    await expect(canvas.queryByText(commandAndFileSummary)).toBeNull();
    await expect(
      canvas.queryAllByRole('button', { name: /^Read / }),
    ).toHaveLength(0);
    await userEvent.click(group);
    await expect(
      canvas.getByRole('button', { name: readFileTitle }),
    ).toBeVisible();

    // The title names the running command once, as Codex does: its output draws in its place, untitled.
    await expect(
      canvas.queryByRole('button', { name: commandLine }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText('Shell')).toBeVisible();
    await userEvent.click(group);
    await waitFor(() =>
      expect(canvas.queryAllByRole('button', { name: /^Read / })).toHaveLength(
        0,
      ),
    );
  },
};

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
        name: commandLine,
      }),
    ).toHaveLength(1);
  },
};

export const AgentParity: Story = {
  render: (args) => (
    <>
      {toolCallGroupMocks.map(({ agent, group }) => (
        <ToolCallGroup {...args} key={agent} group={group} />
      ))}
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

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
      expect(canvas.queryAllByRole('button', { name: /^Read / })).toHaveLength(
        0,
      ),
    );
  },
};

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

const command = failedCommand.content.find(
  (block) => block.type === 'terminal',
)?.command;

if (!command)
  throw new Error('Recorded catalog needs the failed shell command');

export const FailedCommands: Story = {
  args: failedCommandsGroup,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    const group = canvas.getByRole('button', {
      name: 'Ran 2 commands · 1 failed',
    });

    await expect(group).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: command }),
    ).not.toBeInTheDocument();
    await userEvent.click(group);
    const row = canvas.getByRole('button', { name: command });

    await expect(row).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Ran command' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
    await userEvent.click(row);
    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(canvas.getByText('Exit 2')).toBeVisible();
    await userEvent.click(row);
    await waitFor(() =>
      expect(canvas.queryByText('Shell')).not.toBeInTheDocument(),
    );
  },
};

export const AnsweredLiveHeader: Story = {
  args: allowedOnceHeaderGroup,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    await expect(canvas.getAllByText('You allowed this once')).toHaveLength(1);
    await userEvent.click(
      canvas.getByRole('button', {
        name: allowedOnceHeaderGroup.group.liveHeader.text,
      }),
    );
    await expect(canvas.getAllByText('You allowed this once')).toHaveLength(1);
  },
};

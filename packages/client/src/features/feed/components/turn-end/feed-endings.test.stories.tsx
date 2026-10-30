import type { AgentThought, Notice, TurnEnd } from '@repo/contracts';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedFeedMocks } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { recordedFeedMock } from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import { feedContentArgs } from '../feed-content/feed-content.mocks';
import { Feed } from '../feed/feed';
import { endings, stoppedTurn, turnEndItems } from './turn-end.mocks';

const recording = recordedFeedMock('agent-1', 'edit-and-command');

const thought = recordedFeedMocks
  .flatMap((mock) => mock.rows)
  .find((row) => row.sessionUpdate === 'agent_thought');

const command = recording.rows.find(
  (row) => row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
);

if (!thought || !command)
  throw new Error('Recorded Feed needs a thought and Tool call');

const thoughtRow = thought;

const commandRow = command;

const meta = {
  title: 'Tests/Feed/TurnEnd/FeedEndings',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedContentArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const hiddenReasoning = 'Reasoning must never appear in the Feed.';

const thoughtTitle = 'Checking how rows merge after a reconnect';

// The group's own counts summary, which the live header's title replaces while the Turn runs.
const summaryTitle = 'Ran 1 command';

const thoughtContent = (text: string): AgentThought['content'] =>
  text ? [{ type: 'text', text }] : [];

function thinking(
  width: number,
  state: AgentThought['state'],
  text = hiddenReasoning,
): Story {
  const row: AgentThought = {
    ...thoughtRow,
    state,
    content: thoughtContent(text),
  };

  return {
    args: {
      items: toFeedView([commandRow, row], recording.snapshot).items,
      liveHeader:
        state === 'open'
          ? { text: thoughtTitle, source: { type: 'thought' }, startedAt: 0 }
          : null,
      now: 18_000,
    },
    play: async ({ canvas }) => {
      await settleLayout(width);
      await expectThought(canvas, state);
    },
  };
}

async function expectThought(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  state: AgentThought['state'],
): Promise<void> {
  await expect(canvas.queryByText(hiddenReasoning)).not.toBeInTheDocument();
  await expect(
    canvas.queryByRole('button', { name: /Thinking|Thought for/ }),
  ).not.toBeInTheDocument();

  if (state === 'open') {
    // The settled group takes the live header as its title, the one line the Session row shows (#1410).
    await expect(
      canvas.getByRole('button', { name: `${thoughtTitle} 18s` }),
    ).toBeVisible();
    await expect(canvas.queryByText(summaryTitle)).not.toBeInTheDocument();
    await expect(canvas.getByTestId('icon-thinking')).toBeVisible();
  } else {
    await expect(
      canvas.getByRole('button', { name: summaryTitle }),
    ).toBeVisible();
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  }
}

export const ThinkingPhone = thinking(layoutWidths.phone, 'open');

export const ThinkingWide = thinking(layoutWidths.wide, 'open');

export const ThinkingWithoutTextPhone = thinking(
  layoutWidths.phone,
  'open',
  '',
);

export const ThinkingWithoutTextWide = thinking(layoutWidths.wide, 'open', '');

export const SettledThoughtPhone = thinking(layoutWidths.phone, 'settled');

export const SettledThoughtWide = thinking(layoutWidths.wide, 'settled');

function hiddenEnding(width: number, end: TurnEnd): Story {
  return {
    args: { items: turnEndItems(end) },
    play: async ({ canvas }) => {
      await settleLayout(width);
      await expect(
        canvas.getByRole('heading', { name: 'What should we build?' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
  };
}

export const CompletedPhone = hiddenEnding(
  layoutWidths.phone,
  endings.completed,
);

export const CompletedWide = hiddenEnding(layoutWidths.wide, endings.completed);

function crashNotice(width: number): Story {
  const notice: Notice = {
    ...stoppedTurn.row,
    turnId: commandRow.turnId,
    severity: 'warning',
    title: 'Agent exited with status 1',
    description: 'Last stderr line',
  };

  const interruption: Notice = {
    ...notice,
    id: `${notice.turnId}:interrupted`,
    title: 'Output may be missing',
    description: undefined,
  };

  const marker: Notice = {
    ...notice,
    id: `${notice.id}:end`,
    title: 'Turn ended',
    description: undefined,
    _meta: { argo: { turnEnd: endings.interrupted } },
  };

  return {
    args: {
      items: toFeedView(
        [commandRow, notice, interruption, marker],
        recording.snapshot,
      ).items,
    },
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Ran 1 command' }),
      );
      await expect(
        canvas.getAllByText('Agent exited with status 1'),
      ).toHaveLength(1);
      await expect(canvas.getByText('Last stderr line')).toBeVisible();
      await expect(
        canvas.queryByText('The Turn ended with an error'),
      ).not.toBeInTheDocument();
    },
  };
}

export const CrashNoticePhone = crashNotice(layoutWidths.phone);

export const CrashNoticeWide = crashNotice(layoutWidths.wide);

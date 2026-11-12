import {
  eachLayout,
  layoutWidths,
  settleLayout,
} from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  subagentItemOf,
  exploreMessage,
  explorePrompt,
  exploreResult,
  exploreSessionId,
  exploreTitle,
} from '../../../../../mocks/subagent-rows.mocks';
import rowMeta from './subagent-row.stories';

const meta = {
  ...rowMeta,
  title: 'Tests/Feed/SubagentRow',
  args: { ...rowMeta.args, onOpen: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

// Each row names the action and the Agent and leads with its role mark; the words said stay in the Agent's Feed.
const exploreMark = `${subagentItemOf('started').role} Agent`;

const saysNothingSaid = async (
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
): Promise<void> => {
  for (const said of [explorePrompt, exploreMessage, exploreResult])
    await expect(canvas.queryByText(said, { exact: false })).toBeNull();
};

export const Started: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('button', { name: `Started ${exploreTitle}` }),
      ).toBeVisible();
      await expect(canvas.getByLabelText(exploreMark)).toBeVisible();
      await saysNothingSaid(canvas);
    }),
};

export const Messaged: Story = {
  args: {
    item: subagentItemOf('messaged'),
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('button', { name: `Messaged ${exploreTitle}` }),
      ).toBeVisible();
      await expect(canvas.getByLabelText(exploreMark)).toBeVisible();
      await saysNothingSaid(canvas);
    }),
};

export const Replied: Story = {
  args: {
    item: subagentItemOf('replied'),
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('button', { name: `${exploreTitle} replied` }),
      ).toBeVisible();
      await expect(canvas.getByLabelText(exploreMark)).toBeVisible();
      await expect(canvas.queryByText(`Started ${exploreTitle}`)).toBeNull();
      await saysNothingSaid(canvas);
    }),
};

// Every action opens the same place: the Subagent's Feed.
function opens(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      await userEvent.click(canvas.getByRole('button', { name: /^Started/ }));
      await expect(args.onOpen).toHaveBeenCalledWith(exploreSessionId);
    },
  };
}

export const OpensPhone = opens(layoutWidths.phone);

export const OpensWide = opens(layoutWidths.wide);

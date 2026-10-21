import { eachLayout, layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
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
  title: 'Tests/SubagentRow',
  args: { ...rowMeta.args, onOpen: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

const quoted = (text: string): string => `“${text}”`;

// The row's words are one clamped line, so the title never gives way before the quote.

export const Started: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('button', {
          name: `Started ${exploreTitle}, ${explorePrompt}`,
        }),
      ).toBeVisible();
      await expect(canvas.getByText(`Started ${exploreTitle}`)).toBeVisible();
      await expect(canvas.getByText(explorePrompt)).toBeVisible();
      await expect(canvas.queryByText(quoted(explorePrompt))).toBeNull();
    }),
};

export const Messaged: Story = {
  args: {
    item: subagentItemOf('messaged'),
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByText(`Messaged ${exploreTitle} ${quoted(exploreMessage)}`),
      ).toBeVisible();
    }),
};

export const Replied: Story = {
  args: {
    item: subagentItemOf('replied'),
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByText(`${exploreTitle} replied ${quoted(exploreResult)}`),
      ).toBeVisible();
      await expect(canvas.queryByText(`Started ${exploreTitle}`)).toBeNull();
    }),
};

// Every action opens the same place: the Subagent's Feed.
function opens(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: /^Started/ }));
      await expect(args.onOpen).toHaveBeenCalledWith(exploreSessionId);
    },
  };
}

export const OpensPhone = opens(layoutWidths.phone);

export const OpensWide = opens(layoutWidths.wide);

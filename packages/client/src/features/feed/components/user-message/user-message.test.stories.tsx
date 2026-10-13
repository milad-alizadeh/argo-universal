import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { lineViews } from '../../../../../mocks/line-views';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  type MockAgent,
  recordedImageUrl,
  recordedPrompt,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { UserMessage } from './user-message';

const meta = {
  title: 'Tests/UserMessage',
  globals: { mode: 'light' },
  component: UserMessage,
  // The Feed gives every row its full width.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: {
    row: recordedUserMessage('agent-1', 'interrupt'),
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof UserMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const widths = [layoutWidths.phone, layoutWidths.wide];

export const InlineCode: Story = {
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      const codeElement = canvas.getAllByText('sleep 20 && echo done', {
        exact: true,
      })[0];
      if (!codeElement) throw new Error('Inline code is missing');
      const prose = canvas.getAllByText(/^Run the shell command/)[0];
      if (!prose) throw new Error('Message prose is missing');
      await expect(codeElement).toBeVisible();
      await expect(prose).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Show more' }),
      ).toBeNull();
      const container = prose.closest('.w-full');
      if (!container) throw new Error('Expected the Feed row');
      await expect(prose.getBoundingClientRect().right).toBeLessThanOrEqual(
        container.getBoundingClientRect().right,
      );
    }
  },
};

function opensImage(agent: MockAgent, width: number): Story {
  return {
    args: { row: recordedUserMessage(agent, 'image-prompt') },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(within(document.body).queryByRole('dialog')).toBeNull();
      const thumbnail = canvas.getByRole('button', {
        name: 'Open image, 32×32',
      });
      const thumbnailWidth = thumbnail.getBoundingClientRect().width;
      await userEvent.click(thumbnail);
      const dialog = await within(document.body).findByRole('dialog');
      const image = within(dialog).getByRole('img', { name: '32×32' });
      await waitFor(() => expect(dialog).toBeVisible());
      await expect(image.getBoundingClientRect().width).toBeGreaterThan(
        thumbnailWidth,
      );
      await userEvent.keyboard('{Escape}');
      await expect(within(document.body).queryByRole('dialog')).toBeNull();
    },
  };
}
export const FirstAgentOpensImagePhone = opensImage(
  'agent-1',
  layoutWidths.phone,
);
export const FirstAgentOpensImageWide = opensImage(
  'agent-1',
  layoutWidths.wide,
);
export const SecondAgentOpensImagePhone = opensImage(
  'agent-2',
  layoutWidths.phone,
);
export const SecondAgentOpensImageWide = opensImage(
  'agent-2',
  layoutWidths.wide,
);

// A long markdown prompt shows only whole lines above Show more, then every line once expanded.
function showsMore(agent: MockAgent, width: number): Story {
  return {
    args: { row: recordedPrompt(agent, 'markdown-prompt') },
    play: async ({ canvas, canvasElement, userEvent }) => {
      await settleViewport(width);
      const showMore = await canvas.findByRole('button', { name: 'Show more' });
      await waitFor(() =>
        expect(lineViews(canvasElement)).not.toContain('cut'),
      );
      await expect(lineViews(canvasElement)).toContain('hidden');
      await userEvent.click(showMore);
      await expect(
        canvas.queryByRole('button', { name: 'Show more' }),
      ).toBeNull();
      await waitFor(() =>
        expect(new Set(lineViews(canvasElement))).toEqual(new Set(['shown'])),
      );
    },
  };
}
// Between phone and wide, the prompt's fourth line ends inside a list rather than at a paragraph end.
const narrowWidth = 600;
export const FirstAgentShowMorePhone = showsMore('agent-1', layoutWidths.phone);
export const FirstAgentShowMoreNarrow = showsMore('agent-1', narrowWidth);
export const FirstAgentShowMoreWide = showsMore('agent-1', layoutWidths.wide);
export const SecondAgentShowMorePhone = showsMore(
  'agent-2',
  layoutWidths.phone,
);
export const SecondAgentShowMoreNarrow = showsMore('agent-2', narrowWidth);
export const SecondAgentShowMoreWide = showsMore('agent-2', layoutWidths.wide);

// The same prompt fits on a wide screen, then clamps again to whole lines once the window narrows.
export const ClampsAgainWhenNarrowed: Story = {
  args: { row: recordedUserMessage('agent-2', 'markdown-answer') },
  play: async ({ canvas, canvasElement }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    await settleViewport(layoutWidths.phone);
    await canvas.findByRole('button', { name: 'Show more' });
    await waitFor(() => expect(lineViews(canvasElement)).not.toContain('cut'));
    await expect(lineViews(canvasElement)).toContain('hidden');
  },
};

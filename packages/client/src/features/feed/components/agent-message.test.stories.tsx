import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, spyOn, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { layoutWidths } from '../../../../mocks/each-layout';
import {
  recordedAgentMessage,
  streamingAgentMessage,
} from '../../../../mocks/feed-message-mock';
import { settleViewport } from '../../../../mocks/settle-viewport';
import { AgentMessage } from './agent-message';

const markdownAnswerId = 'markdown-answer';
const streamingCaretId = 'streaming-caret';

const meta = {
  title: 'Tests/AgentMessage',
  globals: { themeId: 'default', mode: 'light' },
  component: AgentMessage,
  // The Feed gives every row its full width.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { row: recordedAgentMessage('agent-1', markdownAnswerId) },
} satisfies Meta<typeof AgentMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const widths = [layoutWidths.phone, layoutWidths.wide];

function markdownPlay(heading: string, firstHeader: string) {
  return async ({
    canvas,
  }: {
    canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'];
  }): Promise<void> => {
    for (const width of widths) {
      await settleViewport(width);
      for (const text of [heading, 'feed.rows', '1.', 'tsx', firstHeader]) {
        await expect(canvas.getAllByText(text)[0]).toBeVisible();
      }
      await expect(
        canvas.getByRole('link', { name: 'ADR 0007' }),
      ).toBeVisible();
      await expect(canvas.queryByTestId(streamingCaretId)).toBeNull();
    }
  };
}

export const FirstAgentMarkdown: Story = {
  play: markdownPlay('Feed Re-rendering All Rows', 'Row state'),
};

export const SecondAgentMarkdown: Story = {
  args: { row: recordedAgentMessage('agent-2', markdownAnswerId) },
  play: markdownPlay('Why every Feed row re-renders', 'Property'),
};

export const FirstAgentStreaming: Story = {
  args: { row: streamingAgentMessage('agent-1', markdownAnswerId) },
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByTestId(streamingCaretId)).toBeVisible();
    }
  },
};

export const SecondAgentStreaming: Story = {
  args: { row: streamingAgentMessage('agent-2', markdownAnswerId) },
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByTestId(streamingCaretId)).toBeVisible();
    }
  },
};

export const CopyCodeRevealsOnHover: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    const copy = canvas.getByRole('button', { name: 'Copy code' });
    await page.elementLocator(copy).unhover();
    await expect(copy).not.toBeVisible();
    await page.elementLocator(canvas.getByText('tsx')).hover();
    await waitFor(() => expect(copy).toBeVisible());
  },
};

function copyCode(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      const copied: string[] = [];
      const clipboard = spyOn(
        navigator.clipboard,
        'writeText',
      ).mockImplementation(async (text: string) => void copied.push(text));
      try {
        await settleViewport(width);
        const copy = canvas.getByRole('button', { name: 'Copy code' });
        await expect(
          canvas.queryByRole('button', { name: 'Copied' }),
        ).toBeNull();
        await expect(copied).toEqual([]);
        await userEvent.click(copy);
        await expect(
          await canvas.findByRole('button', { name: 'Copied' }),
        ).toBeVisible();
        await expect(copied).toHaveLength(1);
        await expect(copied[0]).toContain(
          'feed.rows.map((row, index) => <Row key={index} data={row} />)',
        );
        await waitFor(
          () => expect(canvas.getByRole('button', { name: 'Copy code' })),
          { timeout: 3000 },
        );
      } finally {
        clipboard.mockRestore();
      }
    },
  };
}
export const CopyCodePhone = copyCode(layoutWidths.phone);
export const CopyCodeWide = copyCode(layoutWidths.wide);

export const TableScrollsSideways: Story = {
  args: { row: recordedAgentMessage('agent-2', markdownAnswerId) },
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      let scroller = canvas.getByText('Property').parentElement;
      while (scroller && getComputedStyle(scroller).overflowX !== 'auto')
        scroller = scroller.parentElement;
      if (!scroller) throw new Error('Expected the table to scroll');
      const overflows = scroller.scrollWidth > scroller.clientWidth;
      await expect(overflows).toBe(width < 720);
    }
  },
};

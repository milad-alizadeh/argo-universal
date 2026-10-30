import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, spyOn, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  recordedAgentMessage,
  streamingAgentMessage,
} from '../../../../lib/product/feed-message.mocks';
import { AgentMessage } from './agent-message';

const markdownAnswerId = 'markdown-answer';

const streamingCaretId = 'streaming-caret';

const meta = {
  title: 'Tests/Feed/AgentMessage',
  globals: { mode: 'light' },
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
      await settleLayout(width);

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
      await settleLayout(width);
      await expect(canvas.getByTestId(streamingCaretId)).toBeVisible();
    }
  },
};

export const SecondAgentStreaming: Story = {
  args: { row: streamingAgentMessage('agent-2', markdownAnswerId) },
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleLayout(width);
      await expect(canvas.getByTestId(streamingCaretId)).toBeVisible();
    }
  },
};

export const CopyCodeRevealsOnHover: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');
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
        await settleLayout(width);
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

function horizontalScroller(element: HTMLElement | null): HTMLElement {
  if (!element) throw new Error('Expected the table to scroll');

  if (getComputedStyle(element).overflowX === 'auto') return element;

  return horizontalScroller(element.parentElement);
}

/*
 * A Markdown table's columns take the width their own text needs, so an answer's two-column table holds both
 * columns on a phone: nothing scrolls sideways, and every cell is read where it is. A table too wide for the
 * page still scrolls, which the kit's own Table stories guarantee.
 */
export const TableHoldsBothColumnsOnPhones: Story = {
  args: { row: recordedAgentMessage('agent-2', markdownAnswerId) },
  play: async ({ canvas }) => {
    await settleLayout('phone');

    const scroller = horizontalScroller(
      canvas.getByText('Result').parentElement,
    );

    scroller.scrollLeft = scroller.scrollWidth;
    await waitFor(() => expect(scroller.scrollLeft).toBe(0));
    await expect(canvas.getByText('Property')).toBeVisible();
    await expect(canvas.getByText('Result')).toBeVisible();
    await expect(canvas.getByText('Row state')).toBeVisible();
    await expect(canvas.getByText('Preserved by stable keys')).toBeVisible();
  },
};

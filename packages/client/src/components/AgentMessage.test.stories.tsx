import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  recordedAgentMessage,
  streamingAgentMessage,
} from '../../mocks/feed-message-mock';
import { AgentMessage } from './AgentMessage';

const meta = {
  title: 'Tests/AgentMessage',
  globals: { themeId: 'default', mode: 'light' },
  component: AgentMessage,
  // The Feed gives every row its full width.
  decorators: [
    (Story) => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { row: recordedAgentMessage('agent-1', 'markdown-answer') },
} satisfies Meta<typeof AgentMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const widths = [390, 1440];

async function settleViewport(width: number) {
  const { page } = await import('vitest/browser');
  await page.viewport(width, 844);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

async function expectType(
  element: HTMLElement,
  family: string,
  size: string,
  lineHeight: string,
  weight = '400',
) {
  const style = getComputedStyle(element);
  await expect(style.fontFamily).toContain(family);
  await expect(style.fontSize).toBe(size);
  await expect(style.lineHeight).toBe(lineHeight);
  await expect(style.fontWeight).toBe(weight);
}

function markdownPlay(heading: string, firstHeader: string) {
  return async ({
    canvas,
  }: {
    canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'];
  }) => {
    for (const width of widths) {
      await settleViewport(width);
      await expectType(
        canvas.getByText(heading),
        'SF Pro Text',
        '16px',
        '24px',
        '600',
      );
      const link = canvas.getByRole('link', { name: 'ADR 0007' });
      await expectType(link, 'SF Pro Text', '14px', '22px');
      await expect(getComputedStyle(link).textDecorationLine).toBe('underline');
      await expectType(
        canvas.getAllByText('feed.rows')[0] as HTMLElement,
        'SF Mono',
        '12px',
        '18px',
      );
      await expectType(canvas.getByText('1.'), 'SF Pro Text', '14px', '22px');
      await expectType(canvas.getByText('tsx'), 'SF Mono', '12px', '20px');
      await expectType(
        canvas.getByText(firstHeader),
        'SF Pro Text',
        '14px',
        '20px',
        '600',
      );
      await expect(canvas.queryByTestId('streaming-caret')).toBeNull();
    }
  };
}

export const FirstAgentMarkdown: Story = {
  play: markdownPlay('Feed Re-rendering All Rows', 'Row state'),
};

export const SecondAgentMarkdown: Story = {
  args: { row: recordedAgentMessage('agent-2', 'markdown-answer') },
  play: markdownPlay('Why every Feed row re-renders', 'Property'),
};

export const FirstAgentStreaming: Story = {
  args: { row: streamingAgentMessage('agent-1', 'markdown-answer') },
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByTestId('streaming-caret')).toBeVisible();
    }
  },
};

export const SecondAgentStreaming: Story = {
  args: { row: streamingAgentMessage('agent-2', 'markdown-answer') },
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      await expect(canvas.getByTestId('streaming-caret')).toBeVisible();
    }
  },
};

export const CopyCode: Story = {
  play: async ({ canvas, userEvent }) => {
    const { vi } = await import('vitest');
    const { page } = await import('vitest/browser');
    const copied: string[] = [];
    const clipboard = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockImplementation(async (text: string) => void copied.push(text));
    try {
      await settleViewport(1440);
      const copy = canvas.getByRole('button', { name: 'Copy code' });
      await page.elementLocator(copy).unhover();
      await expect(getComputedStyle(copy).opacity).toBe('0');
      await page.elementLocator(canvas.getByText('tsx')).hover();
      await waitFor(() => expect(getComputedStyle(copy).opacity).toBe('1'));
      for (const width of widths) {
        await settleViewport(width);
        await userEvent.click(
          canvas.getByRole('button', { name: 'Copy code' }),
        );
        await expect(
          await canvas.findByRole('button', { name: 'Copied' }),
        ).toBeVisible();
        await expect(copied.at(-1)).toContain(
          'feed.rows.map((row, index) => <Row key={index} data={row} />)',
        );
        await waitFor(
          () => expect(canvas.getByRole('button', { name: 'Copy code' })),
          { timeout: 3000 },
        );
      }
    } finally {
      clipboard.mockRestore();
    }
  },
};

export const TableScrollsSideways: Story = {
  args: { row: recordedAgentMessage('agent-2', 'markdown-answer') },
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

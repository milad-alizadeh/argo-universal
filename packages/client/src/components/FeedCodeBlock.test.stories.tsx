import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { longCodeBlockTitle } from '../../mocks/code-block-title-mock';
import { recordedFile } from '../../mocks/feed-edit-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { FeedCodeBlock } from './FeedCodeBlock';

const meta = {
  title: 'Tests/FeedCodeBlock',
  component: FeedCodeBlock,
  args: {
    code: recordedFile('agent-2', 'edit-states')
      .hunks.flatMap((hunk) => hunk.lines.map((line) => line.text))
      .join('\n'),
    language: 'txt',
  },
} satisfies Meta<typeof FeedCodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CodeBlockScrollsInsideTheBox: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await settleViewport(width);
      const box = canvas.getByTestId('code-scroll');
      await expect(box.clientHeight).toBe(width < 720 ? 300 : 400);
      await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
      box.scrollTop = box.scrollHeight;
      await waitFor(() => expect(box.scrollTop).toBeGreaterThan(0));
      await page.elementLocator(canvas.getByTestId('code-block-title')).hover();
      await expect(
        canvas.getByRole('button', { name: 'Copy code' }),
      ).toBeVisible();
    }
  },
};

export const LongTitleKeepsFilenameVisible: Story = {
  args: { language: longCodeBlockTitle },
  render: (args) => (
    <View style={{ width: 240 }}>
      <FeedCodeBlock {...args} />
    </View>
  ),
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;
    for (const width of [390, 1440]) {
      await settleViewport(width);
      const title = canvas.getByTestId('code-block-title');
      await expect(title.textContent).toContain(longCodeBlockTitle);
      await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
      const node = title.firstChild;
      if (!(node instanceof globalThis.Text))
        throw new Error('Missing title text');
      const start = node.data.indexOf('useWide.ts');
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + 'useWide.ts'.length);
      const filename = range.getBoundingClientRect();
      const bounds = title.getBoundingClientRect();
      await expect(filename.left).toBeGreaterThanOrEqual(bounds.left - 1);
      await expect(filename.right).toBeLessThanOrEqual(bounds.right + 1);
    }
  },
};

export const CopyIconFollowsCssHoverAndFocus: Story = {
  render: (args) => (
    <View className="p-4">
      <FeedCodeBlock {...args} />
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    if (process.env.NODE_ENV !== 'test') return;
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await settleViewport(width);
      const copy = canvas.getByRole('button', { name: 'Copy code' });
      const box = canvas.getByTestId('code-scroll').parentElement;
      if (!box) throw new Error('Missing code block');
      await page.elementLocator(box).unhover({ position: { x: 1, y: 1 } });
      await expect(getComputedStyle(copy).opacity).toBe('0');
      await page.elementLocator(canvas.getByTestId('code-scroll')).hover();
      await expect(getComputedStyle(copy).opacity).toBe('1');
      await page.elementLocator(box).unhover({ position: { x: 1, y: 1 } });
      await expect(getComputedStyle(copy).opacity).toBe('0');
      await userEvent.tab();
      await expect(copy).toHaveFocus();
      await expect(getComputedStyle(copy).opacity).toBe('1');
      await userEvent.tab();
    }
  },
};

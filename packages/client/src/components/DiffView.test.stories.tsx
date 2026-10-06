import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { recordedFile } from '../../mocks/feed-edit-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { DiffView } from './DiffView';

const meta = {
  title: 'Tests/DiffView',
  component: DiffView,
  globals: { themeId: 'default', mode: 'light' },
  decorators: [
    (Story) => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { file: recordedFile('agent-2', 'edit-states') },
} satisfies Meta<typeof DiffView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LargeDiffScrollsInsideTheBox: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await expect(canvas.queryByText(/@@/)).toBeNull();
      const header = canvas.getByRole('button', {
        name: 'Diff for /repo/large.txt',
      });
      await expect(
        getComputedStyle(within(header).getByText('/repo/large.txt'))
          .userSelect,
      ).toBe('none');
      await page.elementLocator(header).hover();
      for (const count of ['+60', '-60']) {
        await expect(
          getComputedStyle(canvas.getByText(count)).textDecorationLine,
        ).toBe('none');
      }
      const headerContainer = header.parentElement;
      if (!headerContainer) throw new Error('Missing diff header');
      const buttonBounds = header.getBoundingClientRect();
      const countsBounds = canvas.getByText('+60').getBoundingClientRect();
      await expect(buttonBounds.right).toBeLessThan(countsBounds.left - 10);
      const containerBounds = headerContainer.getBoundingClientRect();
      await page.elementLocator(headerContainer).click({
        position: {
          x:
            (buttonBounds.right + countsBounds.left) / 2 - containerBounds.left,
          y: containerBounds.height / 2,
        },
      });
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      const numberColors: string[] = [];
      for (const [text, sign] of [
        ['old value 1', '-'],
        ['new value 1', '+'],
      ] as const) {
        const row = canvas.getByText(text).parentElement;
        if (!row) throw new Error('Missing diff line');
        const numberColor = getComputedStyle(within(row).getByText('1')).color;
        numberColors.push(numberColor);
        await expect(numberColor).toBe(
          getComputedStyle(within(row).getByText(sign)).color,
        );
      }
      await expect(numberColors[0]).not.toBe(numberColors[1]);
      const box = canvas.getByTestId('diff-scroll');
      await expect(getComputedStyle(box).maxHeight).toBe(
        width < 720 ? '300px' : '400px',
      );
      await expect(box.clientHeight).toBe(width < 720 ? 300 : 400);
      await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
      box.scrollTop = box.scrollHeight;
      await waitFor(() => expect(box.scrollTop).toBeGreaterThan(0));
      await waitFor(() =>
        expect(
          canvas.getByText('new value 60').getBoundingClientRect().bottom,
        ).toBeLessThanOrEqual(box.getBoundingClientRect().bottom + 1),
      );
      await expect(
        canvas.getByRole('button', { name: 'Diff for /repo/large.txt' }),
      ).toBeVisible();
    }
  },
};

export const InlinePreviewShowsAll: Story = {
  args: { inline: true },
  play: async ({ canvas, userEvent }) => {
    if (process.env.NODE_ENV !== 'test') return;
    const { page } = await import('vitest/browser');
    const clipboard = spyOn(
      navigator.clipboard,
      'writeText',
    ).mockResolvedValue();
    try {
      for (const width of [390, 1440]) {
        await settleViewport(width);
        const title = canvas.getByTestId('code-block-title');
        await expect(title.textContent).toContain('/repo/large.txt');
        const header = title.parentElement;
        if (!header) throw new Error('Missing diff header');
        await expect(header.getBoundingClientRect().height).toBe(32);
        await page.elementLocator(header).hover();
        const copy = canvas.getByRole('button', { name: /Copy code|Copied/ });
        await expect(copy).toBeVisible();
        await userEvent.click(copy);
        await waitFor(() =>
          expect(clipboard).toHaveBeenCalledWith(
            expect.stringContaining('new value 60'),
          ),
        );
        await expect(
          canvas.getByRole('button', { name: 'Copied' }),
        ).toBeVisible();
        const showAll = canvas.queryByRole('button', {
          name: 'Show all 120 lines',
        });
        if (showAll) {
          await expect(canvas.queryByText('new value 60')).toBeNull();
          await userEvent.click(showAll);
        }
        await expect(canvas.queryByText(/@@/)).toBeNull();
        const box = canvas.getByTestId('diff-scroll');
        await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
        box.scrollTop = box.scrollHeight;
        await waitFor(() => expect(box.scrollTop).toBeGreaterThan(0));
        await expect(
          canvas.queryByRole('button', { name: 'Show all 120 lines' }),
        ).toBeNull();
        await expect(within(box).getByText('new value 60')).toBeVisible();
      }
    } finally {
      clipboard.mockRestore();
    }
  },
};

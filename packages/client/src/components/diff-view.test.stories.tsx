import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { recordedFile } from '../../mocks/feed-edit-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { DiffView } from './diff-view';

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

// In the Inspector a file shows every line; the Inspector scrolls, not the file.
export const InspectorFileShowsEveryLine: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;
    const { page } = await import('vitest/browser');
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(canvas.queryByText(/@@/)).toBeNull();
      const header = canvas.getByRole('button', {
        name: 'Diff for /repo/large.txt',
      });
      await expect(
        getComputedStyle(within(header).getByText('large.txt')).userSelect,
      ).toBe('none');
      await expect(within(header).getByText('large.txt')).toHaveClass(
        'font-semibold',
      );
      await expect(
        canvas.getByRole('button', { name: 'Copy path' }),
      ).toBeVisible();
      await page.elementLocator(header).hover();
      for (const count of ['+60', '−60']) {
        await expect(
          getComputedStyle(canvas.getByText(count)).textDecorationLine,
        ).toBe('none');
      }
      // The path button fills the header up to the copy button, so there is no dead space to miss.
      const copyBounds = canvas
        .getByRole('button', { name: 'Copy path' })
        .getBoundingClientRect();
      const buttonBounds = header.getBoundingClientRect();
      await expect(buttonBounds.right).toBeLessThanOrEqual(copyBounds.left);
      await expect(copyBounds.left - buttonBounds.right).toBeLessThanOrEqual(8);
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      const numberColors: string[] = [];
      for (const [text, sign] of [
        ['old value 1', '−'],
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
      await expect(getComputedStyle(box).maxHeight).toBe('none');
      await expect(box.scrollHeight).toBe(box.clientHeight);
      await expect(box.clientHeight).toBe(120 * 20);
      await expect(
        canvas.getByRole('button', { name: 'Diff for /repo/large.txt' }),
      ).toBeVisible();
    }
  },
};

// One story per width, so the first width's "Show all" click never hides the button from the next.
function inlinePreview(width: number): Story {
  return {
    args: { inline: true },
    play: async ({ canvas, userEvent }) => {
      if (process.env.NODE_ENV !== 'test') return;
      const { page } = await import('vitest/browser');
      const clipboard = spyOn(
        navigator.clipboard,
        'writeText',
      ).mockResolvedValue();
      try {
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
        await expect(canvas.queryByText('new value 60')).toBeNull();
        await userEvent.click(
          canvas.getByRole('button', { name: 'Show all 120 lines' }),
        );
        await expect(canvas.queryByText(/@@/)).toBeNull();
        const box = canvas.getByTestId('diff-scroll');
        await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
        box.scrollTop = box.scrollHeight;
        await waitFor(() => expect(box.scrollTop).toBeGreaterThan(0));
        await expect(
          canvas.queryByRole('button', { name: 'Show all 120 lines' }),
        ).toBeNull();
        await expect(within(box).getByText('new value 60')).toBeVisible();
      } finally {
        clipboard.mockRestore();
      }
    },
  };
}
export const InlinePreviewShowsAllPhone = inlinePreview(layoutWidths.phone);
export const InlinePreviewShowsAllWide = inlinePreview(layoutWidths.wide);

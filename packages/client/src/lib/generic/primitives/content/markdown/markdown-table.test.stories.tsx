import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { router } from 'expo-router';
import { expect, spyOn, waitFor } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { canPointAt } from '../../../../../../mocks/point-hit';
import { Markdown } from './index';

const meta = {
  title: 'Tests/MarkdownTable',
  component: Markdown,
  args: { text: '' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeaderLinksRemainInteractive: Story = {
  args: {
    text: '| [Read more](/settings) | Value |\n| --- | --- |\n| Item | 42 |',
  },
  play: async ({ canvas, userEvent }) => {
    const navigate = spyOn(router, 'navigate').mockImplementation(() => {});

    try {
      await userEvent.click(canvas.getByRole('link', { name: 'Read more' }));
      await expect(navigate).toHaveBeenCalledWith('/settings');
    } finally {
      navigate.mockRestore();
    }
  },
};

const longCell =
  'This is a long description that should wrap across several lines because it contains many ordinary words that must remain readable in the table cell.';

export const WrappedCellsRemainReadable: Story = {
  args: {
    text: `| Name | Value |\n| --- | --- |\n| First | ${longCell} [Read more](/settings) |\n| Second | Next row |`,
  },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    const link = canvas.getByRole('link', { name: 'Read more', hidden: true });
    await waitFor(() => expect(canPointAt(link)).toBe(true));
    await expect(canvas.getByText('Next row')).toBeVisible();
  },
};

function horizontalScroller(element: HTMLElement | null): HTMLElement {
  if (!element) throw new Error('Expected the table to scroll');

  if (getComputedStyle(element).overflowX === 'auto') return element;

  return horizontalScroller(element.parentElement);
}

export const WideTablesKeepEveryColumnReachable: Story = {
  args: {
    text: '| A | B | C | D | E | F | G |\n| --- | --- | --- | --- | --- | --- | --- |\n| First | Two | Three | Four | Five | Six | Last column |',
  },
  play: async ({ canvas }) => {
    await settleViewport(1024);
    const last = canvas.getByText('Last column');
    const scroller = horizontalScroller(last);
    scroller.scrollLeft = scroller.scrollWidth;
    await waitFor(() => expect(scroller.scrollLeft).toBeGreaterThan(0));
    await waitFor(() => expect(canPointAt(last)).toBe(true));
    await expect(canvas.getByText('First')).toBeVisible();
  },
};

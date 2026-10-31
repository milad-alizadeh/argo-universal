import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { canPointAt } from '../../../../mocks/point-hit';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Markdown/Table',
  component: Markdown,
  args: { text: '' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeaderLinksStayReachable: Story = {
  args: {
    text: '| [Read more](https://example.com) | Value |\n| --- | --- |\n| Item | 42 |',
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Read more' });
    await expect(link).toHaveAttribute('href', 'https://example.com');
    await waitFor(() => expect(canPointAt(link)).toBe(true));
  },
};

const longCell =
  'This is a long description that should wrap across several lines because it contains many ordinary words that must remain readable in the table cell.';

export const WrappedCellsRemainReadable: Story = {
  args: {
    text: `| Name | Value |\n| --- | --- |\n| First | ${longCell} [Read more](https://example.com) |\n| Second | Next row |`,
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const link = canvas.getByRole('link', { name: 'Read more' });
    await waitFor(() => expect(canPointAt(link)).toBe(true));
    await expect(canvas.getByText('Next row')).toBeVisible();
  },
};

export const CompactCellLinksAreTabbable: Story = {
  args: {
    text: '| Name | Info |\n| --- | --- |\n| [First link](https://example.com/a) | [Later link](https://example.com/b) |',
  },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');
    const first = canvas.getByRole('link', { name: 'First link' });
    const later = canvas.getByRole('link', { name: 'Later link' });

    first.focus();
    await expect(first).toHaveFocus();
    await userEvent.tab();
    await expect(later).toHaveFocus();
  },
};

function horizontalScroller(element: HTMLElement | null): HTMLElement {
  if (!element) throw new Error('Expected the table to scroll');

  if (getComputedStyle(element).overflowX === 'auto') return element;

  return horizontalScroller(element.parentElement);
}

export const WideTablesKeepEveryColumnReachable: Story = {
  args: {
    text: '| Component | Platform | Status | Owner | Updated | Coverage | Notes |\n| --- | --- | --- | --- | --- | --- | --- |\n| Table primitive row | iOS and Android both | Waiting on review | Design systems team | Three days ago | Partially covered | Last column |',
  },
  play: async ({ canvas }) => {
    await settleLayout('tablet');
    const last = canvas.getByText('Last column');
    const scroller = horizontalScroller(last);
    scroller.scrollLeft = scroller.scrollWidth;
    await waitFor(() => expect(scroller.scrollLeft).toBeGreaterThan(0));
    await waitFor(() => expect(canPointAt(last)).toBe(true));
    await expect(canvas.getByText('Table primitive row')).toBeVisible();
  },
};

// Whether a header's drawn text is cut short: text that overflows its own box is what an ellipsis hides.
function truncatedTexts(header: HTMLElement): HTMLElement[] {
  return [header, ...header.querySelectorAll<HTMLElement>('*')].filter(
    (element) => element.scrollWidth > element.clientWidth,
  );
}

export const ShortHeadersAreNeverCut: Story = {
  args: {
    text: '| Column A | Column B | Column C |\n| --- | --- | --- |\n| one | two | three |',
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const headers = canvas.getAllByRole('columnheader');
    await expect(headers).toHaveLength(3);
    await waitFor(() =>
      expect(headers.flatMap((header) => truncatedTexts(header))).toEqual([]),
    );
  },
};

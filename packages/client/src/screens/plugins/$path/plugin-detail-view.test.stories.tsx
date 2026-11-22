import type { WireNode } from '@repo/contracts/plugins/wire';
import { runListRoot } from '@repo/contracts/plugins/wire-fixtures';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { loadingTree } from '#features/plugins';
import { PluginDetailView } from './plugin-detail-view';
import { homeFaders, loading } from './plugin-detail-view-fixtures';

const meta = {
  title: 'Tests/Screens/Plugins/Plugin page',
  component: PluginDetailView,
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
  args: { callbacks: { onPageCall: action('Page call') } },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const stacked: WireNode = {
  type: 'Stack',
  key: 'page',
  props: {},
  children: [runListRoot],
  slots: {},
};

function* ancestors(from: HTMLElement): Generator<HTMLElement> {
  for (let el: HTMLElement | null = from; el; el = el.parentElement) yield el;
}

// The nearest ancestor of the rows that scrolls.
function scrollerOf(text: HTMLElement): HTMLElement {
  const found = [...ancestors(text)].find((el) =>
    /auto|scroll/.test(getComputedStyle(el).overflowY),
  );

  if (!found) throw new Error('Recorded catalog needs a scrolling List');

  return found;
}

// More rows than the window holds, as a page of runs has.
const wire = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({
  type,
  key,
  props,
  children: [],
  slots: {},
});

const manyRows: WireNode = {
  ...wire('List', 'many', { appearance: 'cards' }),
  children: Array.from({ length: 40 }, (_, index) =>
    wire('ListItem', `row-${index}`, { title: `Row ${index}` }),
  ),
};

/*
 * A Stack that holds the List must pass the page's height on to it, or the List grows past the window
 * and nothing scrolls.
 */
export const ListInAStackScrolls: Story = {
  args: {
    root: { ...stacked, children: [manyRows] },
  },
  play: async ({ canvas }) => {
    const first = await canvas.findByText('Row 0');
    const scroller = scrollerOf(first);

    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
    await expect(scroller.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
  },
};

// Home changes its outer Stack from a column to a row at wide widths; both must constrain the main ScrollView.
const homeMainPageScrolls = (width: number): Story => ({
  args: homeFaders,
  play: async ({ canvas }) => {
    await settleLayout(width, 500);
    const last = await canvas.findByText('Check the Hue Bridge');
    const scroller = scrollerOf(last);

    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
    await expect(scroller.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(async () => {
      await expect(scroller.scrollTop).toBeGreaterThan(0);
      await expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        scroller.getBoundingClientRect().bottom,
      );
    });
    scroller.scrollTop = 0;
    await expect(scroller.scrollTop).toBe(0);
  },
});

export const HomeMainPageScrollsOnPhone = homeMainPageScrolls(390);

export const HomeMainPageScrollsOnWide = homeMainPageScrolls(1280);

export const WaitingForPage: Story = {
  args: loading,
  play: async ({ canvas }) => {
    const status = await canvas.findByRole('status', { name: 'Loading page' });

    await expect(status).toHaveAttribute('aria-busy', 'true');
    await waitFor(async () => {
      const bar = status.querySelector('[data-skeleton-overlay] > *');

      if (!bar) throw new Error('Waiting for the first skeleton bar');

      const bounds = bar.getBoundingClientRect();

      await expect(bounds.width).toBeGreaterThan(0);
      await expect(bounds.height).toBeGreaterThan(0);
    });
  },
};

// Home's tiles once their Grid has laid out its columns: wider than a gap, as no settled tile is narrower.
const settledTileWidth = 100;

const tilePlaceholders = (status: HTMLElement): DOMRect[] =>
  [...status.querySelectorAll('[data-skeleton-overlay] > *')]
    .map((bar) => bar.getBoundingClientRect())
    .filter((bounds) => bounds.width >= settledTileWidth);

const homeTiles = 4;

/*
 * Home loads as one pulsing shell per tile, at the tile's own width: the Grid lays its columns out under the
 * Skeleton as it does on the page.
 */
export const HomeLoadsAsTileShells: Story = {
  args: { root: null, loadingTree: loadingTree(homeFaders.root) },
  play: async ({ canvas }) => {
    await settleLayout(1280, 500);
    const status = await canvas.findByRole('status', { name: 'Loading page' });

    await waitFor(() =>
      expect(tilePlaceholders(status).length).toBeGreaterThanOrEqual(
        homeTiles,
      ),
    );
  },
};

export const PagedListScrollsBothWays: Story = {
  args: {
    callbacks: { onOpenPage: fn() },
    root: {
      ...manyRows,
      children: manyRows.children.map((row) => ({
        ...row,
        props: {
          ...row.props,
          onPress: { action: 'navigate', path: '/' + row.key },
        },
      })),
      props: {
        appearance: 'plain',
        pagination: { hasMore: false, onLoadMore: { loadMore: true } },
      },
    },
  },
  play: async ({ canvas, args }) => {
    const scroller = scrollerOf(await canvas.findByText('Row 0'));

    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(async () => {
      const last = canvas.getByText('Row 39').getBoundingClientRect();

      await expect(last.top).toBeLessThan(
        scroller.getBoundingClientRect().bottom,
      );
    });
    await userEvent.click(canvas.getByText('Row 39'));
    await expect(args.callbacks.onOpenPage).toHaveBeenLastCalledWith('/row-39');
    scroller.scrollTop = 0;
    await waitFor(async () => {
      const first = canvas.getByText('Row 0').getBoundingClientRect();

      await expect(first.bottom).toBeGreaterThan(
        scroller.getBoundingClientRect().top,
      );
    });
    await userEvent.click(canvas.getByText('Row 0'));
    await expect(args.callbacks.onOpenPage).toHaveBeenLastCalledWith('/row-0');
  },
};

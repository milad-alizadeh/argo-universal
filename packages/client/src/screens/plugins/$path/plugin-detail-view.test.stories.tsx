import type { WireNode } from '@repo/contracts/plugins/wire';
import { runListRoot } from '@repo/contracts/plugins/wire-fixtures';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { PluginDetailView } from './plugin-detail-view';

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

const rowTitle = 'Deploy web';

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

// The gap between the page's edge and the edge of the scroll view that holds the rows: a margin the page adds around the List.
function marginAroundList(canvasElement: HTMLElement): number {
  const page = canvasElement.querySelector('[data-testid="plugin-page"]');

  if (!page) throw new Error('Recorded catalog needs a plugin-page');

  const scroller = scrollerOf(within(canvasElement).getByText(rowTitle));

  return (
    scroller.getBoundingClientRect().left - page.getBoundingClientRect().left
  );
}

const story = (root: WireNode): Story => ({
  args: { root },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText(rowTitle);

    await expect(marginAroundList(canvasElement)).toBe(0);
  },
});

// A List alone on a page keeps to the page's one gutter, whether or not a Stack holds it (#1576).
export const RootList: Story = story(runListRoot);

export const ListInAStack: Story = story(stacked);

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

export const WaitingForPage: Story = {
  args: { root: null },
  play: async ({ canvas }) => {
    const status = await canvas.findByRole('status', { name: 'Loading page' });

    await expect(status).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => {
      const bar = status.querySelector('[data-skeleton-overlay] > *');
      const bounds = bar?.getBoundingClientRect();

      expect(bounds?.width).toBeGreaterThan(0);
      expect(bounds?.height).toBeGreaterThan(0);
    });
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
    await waitFor(() => {
      const last = canvas.getByText('Row 39').getBoundingClientRect();

      expect(last.top).toBeLessThan(scroller.getBoundingClientRect().bottom);
    });
    await userEvent.click(canvas.getByText('Row 39'));
    await expect(args.callbacks.onOpenPage).toHaveBeenLastCalledWith('/row-39');
    scroller.scrollTop = 0;
    await waitFor(() => {
      const first = canvas.getByText('Row 0').getBoundingClientRect();

      expect(first.bottom).toBeGreaterThan(
        scroller.getBoundingClientRect().top,
      );
    });
    await userEvent.click(canvas.getByText('Row 0'));
    await expect(args.callbacks.onOpenPage).toHaveBeenLastCalledWith('/row-0');
  },
};

import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const selectedAttribute = 'aria-pressed';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ListBehaviours',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onPageCall = fn(async () => {});

const root: WireNode = JSON.parse(`{
  "type":"List", "key":"runs", "props":{
    "selection":{"mode":"multiple","selected":[],"onChange":{"bind":"selected"}},
    "searchMode":"plugin", "onSearchTextChange":{"bind":"search"}
  }, "slots":{}, "children":[
    {"type":"ListItem","key":"web","props":{"id":"web","title":"Web"},"slots":{},"children":[]},
    {"type":"ListItem","key":"phone","props":{"id":"phone","title":"Phone"},"slots":{},"children":[]}
  ]
}`);

export const SelectionStaysInEachApp: Story = {
  render: () => (
    <>
      <PluginTree root={root} onPageCall={onPageCall} />
      <PluginTree root={root} onPageCall={onPageCall} />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const rows = await canvas.findAllByRole('button', { name: 'Web' });
    const first = rows[0];
    const second = rows[1];

    if (!first || !second) throw new Error('Expected both Apps');
    await userEvent.click(first);
    await expect(first).toHaveAttribute(selectedAttribute, 'true');
    await expect(second).toHaveAttribute(selectedAttribute, 'false');
    await expect(onPageCall).toHaveBeenLastCalledWith(
      { bind: 'selected' },
      expect.objectContaining({ key: 'runs', payload: ['web'] }),
    );
    await userEvent.click(first);
    await expect(first).toHaveAttribute(selectedAttribute, 'true');
  },
};

export const PluginSearchKeepsLoadedRows: Story = {
  render: () => <PluginTree root={root} onPageCall={onPageCall} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('searchbox', { name: 'Search' }),
      'build',
    );
    await expect(
      await canvas.findByRole('button', { name: 'Web' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(onPageCall).toHaveBeenLastCalledWith(
        { bind: 'search' },
        expect.objectContaining({ key: 'runs', payload: 'build' }),
      ),
    );
  },
};

const loadPage = fn(async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));
});

const pages: WireNode = {
  type: 'List',
  key: 'pages',
  slots: {},
  props: {
    accessibilityLabel: 'Paged list',
    pagination: { hasMore: true, onLoadMore: { loadMore: true } },
  },
  children: Array.from({ length: 40 }, (_, index) => ({
    type: 'ListItem',
    key: String(index),
    props: { title: `Item ${index + 1}` },
    children: [],
    slots: {},
  })),
};

export const PaginationWaitsForThePlugin: Story = {
  render: () => <PluginTree root={pages} onPageCall={loadPage} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText('Paged list');
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      scroll.dispatchEvent(new Event('scroll'));
      await expect(canvas.getByLabelText('Loading more')).toBeVisible();
    });
    await expect(loadPage).toHaveBeenCalledWith(
      { loadMore: true },
      expect.objectContaining({ key: 'pages', name: 'onLoadMore' }),
    );
    await waitFor(() =>
      expect(canvas.queryByLabelText('Loading more')).toBeNull(),
    );
  },
};

const logLines: WireNode = {
  type: 'List',
  key: 'log',
  slots: {},
  props: { accessibilityLabel: 'Log lines', anchor: 'end' },
  children: Array.from({ length: 120 }, (_, index) => ({
    type: 'ListItem',
    key: String(index),
    props: { title: `Item ${index + 1}` },
    children: [],
    slots: {},
  })),
};

export const AnchoredListOffersJumpToLatest: Story = {
  render: () => <PluginTree root={logLines} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText('Log lines');
    await waitFor(() => expect(canvas.getByText('Item 120')).toBeVisible());
    await expect(
      canvas.queryByRole('button', { name: 'Jump to latest' }),
    ).toBeNull();
    await waitFor(async () => {
      scroll.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -scroll.clientHeight }),
      );
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll'));
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    });
  },
};

const refreshable: WireNode = {
  type: 'List',
  key: 'refreshable',
  slots: {},
  props: {
    accessibilityLabel: 'Refreshable list',
    onRefresh: { operation: 'refresh', args: {} },
  },
  children: [
    {
      type: 'ListItem',
      key: 'web',
      props: { title: 'Web' },
      children: [],
      slots: {},
    },
  ],
};

export const RefreshDrawsNothingOnWeb: Story = {
  render: () => <PluginTree root={refreshable} onPageCall={onPageCall} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Web')).toBeVisible();
    await expect(canvas.queryByRole('progressbar')).toBeNull();
    await expect(canvas.queryByRole('button', { name: /refresh/i })).toBeNull();
  },
};

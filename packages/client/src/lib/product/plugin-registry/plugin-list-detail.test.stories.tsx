import { WireNode } from '@repo/contracts/plugins/wire';
import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

type Node = Pick<WireNode, 'type' | 'key' | 'props'> & Partial<WireNode>;

const node = (fields: Node): WireNode => ({
  children: [],
  slots: {},
  ...fields,
});

const syncTitle = 'Sync fails on large repos';

const row = (key: string, title: string, selected: boolean): WireNode =>
  node({
    type: 'ListItem',
    key,
    props: { title, selected, onPress: { $event: 'onPress' } },
  });

const issuePage = node({
  type: 'Page',
  key: 'issue',
  props: { title: syncTitle },
  children: [
    node({
      type: 'Detail',
      key: 'body',
      props: { markdown: 'Sync stops on repositories with 50,000 files.' },
    }),
  ],
});

// The wire leaves an empty slot out, so with nothing selected there is no detail.
function tree(selected: boolean): WireNode {
  const rows = node({
    type: 'List',
    key: 'rows',
    props: { appearance: 'cards' },
    children: [
      row('412', syncTitle, selected),
      row('418', 'Add CSV export', false),
    ],
  });

  const empty = node({
    type: 'EmptyState',
    key: 'none',
    props: { title: 'Select an Issue' },
  });

  const slots: WireNode['slots'] = { list: [rows], empty: [empty] };

  if (selected) slots.detail = [issuePage];

  return WireNode.parse(
    node({ type: 'ListDetail', key: 'issues', props: {}, slots }),
  );
}

const onEvent = fn();

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ListDetail',
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DrawsListBesideTheSelectedPage: Story = {
  render: () => <PluginTree root={tree(true)} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    onEvent.mockClear();
    await expect(
      await canvas.findByRole('heading', { name: syncTitle }),
    ).toBeVisible();
    await expect(
      canvas.getByText('Sync stops on repositories with 50,000 files.'),
    ).toBeVisible();
    await expect(canvas.queryByText(/Update Argo/)).not.toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole('button', { name: /Add CSV export/ }),
    );
    await expect(onEvent).toHaveBeenLastCalledWith('issues#list/rows/418', {
      event: 'onPress',
    });
  },
};

export const NothingSelectedDrawsTheEmptyState: Story = {
  render: () => <PluginTree root={tree(false)} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Select an Issue' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: new RegExp(syncTitle) }),
    ).toBeVisible();
  },
};

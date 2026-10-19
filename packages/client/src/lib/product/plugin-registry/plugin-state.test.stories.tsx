import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin state' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

const section: WireNode = {
  ...node('List.Section', 'choices', {
    selectionMode: 'multiple',
    selection: [],
    onSelectionChange: { $event: 'onSelectionChange' },
  }),
  children: [node('ListItem', 'argo', { id: 'argo', title: 'Argo' })],
};

export const AppsKeepSelectionIndependent: Story = {
  render: () => (
    <>
      <PluginTree
        root={{ ...node('List', 'list', {}), children: [section] }}
        onEvent={onEvent}
      />
      <PluginTree
        root={{ ...node('List', 'list', {}), children: [section] }}
        onEvent={onEvent}
      />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const rows = canvas.getAllByRole('button', { name: 'Argo' });
    await expect(rows).toHaveLength(2);

    for (const [index, payload] of [
      [0, ['argo']],
      [1, ['argo']],
      [0, []],
    ] as const) {
      const row = rows[index];

      if (!row) throw new Error('Expected an Argo row in this App');
      await userEvent.click(row);
      await expect(onEvent).toHaveBeenLastCalledWith('list/choices', {
        event: 'onSelectionChange',
        payload,
      });
    }
  },
};

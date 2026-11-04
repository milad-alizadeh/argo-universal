import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/State',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onPageCall = fn(async () => {});

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

const section: WireNode = {
  ...node('List.Section', 'choices', {
    selectionMode: 'multiple',
    selection: [],
    onSelectionChange: { bind: 'choices' },
  }),
  children: [node('ListItem', 'argo', { id: 'argo', title: 'Argo' })],
};

export const AppsKeepSelectionIndependent: Story = {
  render: () => (
    <>
      <PluginTree
        root={{ ...node('List', 'list', {}), children: [section] }}
        onPageCall={onPageCall}
      />
      <PluginTree
        root={{ ...node('List', 'list', {}), children: [section] }}
        onPageCall={onPageCall}
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
      await expect(onPageCall).toHaveBeenLastCalledWith(
        { bind: 'choices' },
        expect.objectContaining({ key: 'list/choices', payload }),
      );
    }
  },
};

import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler, useState } from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/RowRenders',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const keys = ['a', 'b', 'c', 'd', 'e'];

const row = (key: string): WireNode => ({
  type: 'ListItem',
  key,
  props: {
    id: key,
    title: `Row ${key}`,
    subtitle: `#${key}`,
    onPress: { $event: 'onPress' },
  },
  slots: {
    actions: [
      {
        type: 'Action',
        key: 'close',
        props: { label: `Close ${key}`, onPress: { $event: 'onPress' } },
        slots: {},
        children: [],
      },
    ],
  },
  children: [],
});

const root = WireNode.parse({
  type: 'List',
  key: 'rows',
  props: { density: 'compact' },
  slots: {},
  children: keys.map(row),
});

const patched = applyPatch(root, [
  { op: 'setProps', key: ['c'], props: { title: 'Row c patched' } },
]);

const renders = renderCounter();

// The App holds the tree a view sent and folds each patch onto it, so unchanged rows keep their nodes.
function PatchedTree(): React.JSX.Element {
  const [tree, setTree] = useState(root);
  const [draws, draw] = useState(0);

  return (
    <View style={{ flex: 1 }}>
      <Button label="Patch row c" onPress={() => setTree(patched)} />
      <Button label={`Draw again ${draws}`} onPress={() => draw(draws + 1)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        <View style={{ height: 400 }}>
          <PluginTree
            root={tree}
            onEvent={fn()}
            onOpenPage={(path) => fn()(path, draws)}
          />
        </View>
      </Profiler>
    </View>
  );
}

const titles = (updates: object[]): unknown[] =>
  updates.map((props) => ('title' in props ? props.title : undefined));

export const PatchDrawsOnlyItsRow: Story = {
  render: () => <PatchedTree />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('Row e');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Patch row c' }));
      await canvas.findByText('Row c patched');
    });

    await expect(titles(counts.ListItem?.updates ?? [])).toEqual([
      'Row c patched',
    ]);
    await expect(counts.ListItem?.mounts ?? 0).toBe(0);
    // The List's own row around it draws once, for that row alone.
    await expect(counts.DataListRow?.updates.length ?? 0).toBeLessThanOrEqual(1);
    await expect(counts.ContextActions?.updates.length ?? 0).toBeLessThanOrEqual(1);
  },
};

export const ParentDrawLeavesRowsAlone: Story = {
  render: () => <PatchedTree />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('Row e');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Draw again 0' }),
      );
      await canvas.findByRole('button', { name: 'Draw again 1' });
    });

    await expect(counts.DataListRow).toBeUndefined();
    await expect(counts.ListItem).toBeUndefined();
    await expect(counts.ContextActions).toBeUndefined();
  },
};

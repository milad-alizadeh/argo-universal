import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import {
  renderCounter,
  type RenderCounts,
} from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
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

const patchedTitle = 'Row c patched';

const patched = applyPatch(root, [
  { op: 'setProps', key: ['c'], props: { title: patchedTitle } },
]);

const renders = renderCounter();

// The handler each draw of the tree's owner passes: a row drawn before still reaches the newest.
const firstHandler = fn();

const laterHandler = fn();

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
            onEvent={draws === 0 ? firstHandler : laterHandler}
          />
        </View>
      </Profiler>
    </View>
  );
}

const updatesOf = (counts: RenderCounts, name: string): object[] =>
  counts[name]?.updates ?? [];

const titles = (updates: object[]): unknown[] =>
  updates.map((props) => ('title' in props ? props.title : undefined));

export const PatchDrawsOnlyItsRow: Story = {
  render: () => <PatchedTree />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('Row e');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Patch row c' }),
      );
      await canvas.findByText(patchedTitle);
    });

    await expect(titles(updatesOf(counts, 'ListItem'))).toEqual([patchedTitle]);
    await expect(counts.ListItem).toHaveProperty('mounts', 0);
    // The List's own row around it draws once, for that row alone.
    await expect(updatesOf(counts, 'DataListRow').length).toBeLessThanOrEqual(
      1,
    );
    await expect(
      updatesOf(counts, 'ContextActions').length,
    ).toBeLessThanOrEqual(1);
  },
};

// The components a row draws through, by the names the counter reads.
const rowParts = ['DataListRow', 'ListItem', 'ContextActions'];

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

    // A patch draws one row through the same names, so a renamed part cannot leave this test passing on nothing.
    const patch = await renders.during(canvasElement, async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Patch row c' }),
      );
      await canvas.findByText(patchedTitle);
    });

    await expect(rowParts.filter((name) => name in counts)).toEqual([]);
    await expect(rowParts.filter((name) => name in patch)).toEqual(rowParts);
  },
};

// A row kept from an earlier draw sends its press to the handler the owner passed last.
export const KeptRowReachesNewestHandler: Story = {
  render: () => <PatchedTree />,
  play: async ({ canvas, userEvent }) => {
    firstHandler.mockClear();
    laterHandler.mockClear();
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Draw again 0' }));
    await canvas.findByRole('button', { name: 'Draw again 1' });

    await userEvent.click(canvas.getByText('Row b'));

    await waitFor(() => expect(laterHandler).toHaveBeenCalled());
    await expect(firstHandler).not.toHaveBeenCalled();
  },
};

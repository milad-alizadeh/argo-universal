import { WireNode } from '@repo/contracts/plugins/wire';
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
    onPress: { operation: 'open', args: { id: key } },
  },
  slots: {
    actions: [
      {
        type: 'Action',
        key: 'close',
        props: {
          label: `Close ${key}`,
          onPress: { operation: 'close', args: { id: key } },
        },
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

// The App keeps a Plugin tree by structural sharing: a new tree reuses every node that did not change.
const patched: WireNode = {
  ...root,
  children: root.children.map((child) =>
    child.key === 'c'
      ? { ...child, props: { ...child.props, title: patchedTitle } }
      : child,
  ),
};

const renders = renderCounter();

// The handler each draw of the tree's owner passes: a row drawn before still reaches the newest.
const firstHandler = fn(async () => {});

const laterHandler = fn(async () => {});

// The App keeps the tree a page loaded and shares each node a new tree did not change, so unchanged rows keep their nodes.
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
            onPageCall={draws === 0 ? firstHandler : laterHandler}
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

// A handler the owner adds after a row was drawn still receives that row's press.
function LateHandlerTree(): React.JSX.Element {
  const [added, add] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Button label="Add handler" onPress={() => add(true)} />
      <View style={{ height: 400 }}>
        <PluginTree root={root} onPageCall={added ? laterHandler : undefined} />
      </View>
    </View>
  );
}

export const KeptRowReachesHandlerAddedLater: Story = {
  render: () => <LateHandlerTree />,
  play: async ({ canvas, userEvent }) => {
    laterHandler.mockClear();
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Add handler' }));
    await userEvent.click(canvas.getByText('Row b'));

    await waitFor(() => expect(laterHandler).toHaveBeenCalled());
  },
};

import type { WireNode } from '@repo/contracts/plugins/wire';
import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler, useState } from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { issueListTree } from './plugin-list-scrolling-fixtures';
import { PluginTree } from './plugin-registry';

/*
 * A Plugin List hands the rows the Server sent to the list as data. A load more draws only the rows it added, and a
 * change to one row draws only that row; the rest keep the objects they were, so their cells do not draw again.
 */
const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ListData',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const pageSize = 12;

const changeList = 'Change list';

const retitle = 'Retitled issue';

const firstPage = issueListTree(pageSize);

// The App keeps the nodes a new tree did not change, so a longer tree holds the first page's own objects.
const loadedMore: WireNode = {
  ...firstPage,
  children: [
    ...firstPage.children,
    ...issueListTree(pageSize * 2).children.slice(pageSize),
  ],
};

const retitled: WireNode = {
  ...firstPage,
  children: firstPage.children.map((child, index) =>
    index === 2
      ? { ...child, props: { ...child.props, title: retitle } }
      : child,
  ),
};

const renders = renderCounter();

function ChangingList({ next }: { next: WireNode }): React.JSX.Element {
  const [tree, setTree] = useState(firstPage);

  return (
    <View style={{ flex: 1 }}>
      <Button label={changeList} onPress={() => setTree(next)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        <View style={{ height: 1200 }}>
          <PluginTree root={tree} onPageCall={fn(async () => {})} />
        </View>
      </Profiler>
    </View>
  );
}

export const LoadMoreDrawsOnlyNewRows: Story = {
  render: () => <ChangingList next={loadedMore} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('PROJ-1');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: changeList }));
      await canvas.findByText('PROJ-20');
    });

    // The rows already drawn do not draw again; only the added rows mount.
    await expect(counts.ListItem?.updates ?? []).toEqual([]);
    await expect(counts.ListItem?.mounts).toBeLessThanOrEqual(pageSize);
  },
};

export const ChangedRowDrawsAlone: Story = {
  render: () => <ChangingList next={retitled} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('PROJ-1');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: changeList }));
      await canvas.findByText(retitle);
    });

    await expect(counts.ListItem?.updates).toHaveLength(1);
    await expect(counts.ListItem).toHaveProperty('mounts', 0);
  },
};

const sectionOf = (key: string, rows: WireNode[]): WireNode => ({
  type: 'List.Section',
  key,
  props: { title: `Section ${key}` },
  slots: {},
  children: rows,
});

const retitledRow = (child: WireNode, index: number): WireNode =>
  index === 2 ? { ...child, props: { ...child.props, title: retitle } } : child;

const firstRows = firstPage.children.slice(0, 6);

const sectionTwo = sectionOf('two', firstPage.children.slice(6));

const sectioned: WireNode = {
  ...firstPage,
  children: [sectionOf('one', firstRows), sectionTwo],
};

// The same change inside a Section: its row draws alone, and Sections and moves keep reading it as they did.
const retitledInSection: WireNode = {
  ...firstPage,
  children: [sectionOf('one', firstRows.map(retitledRow)), sectionTwo],
};

function SectionedList(): React.JSX.Element {
  const [tree, setTree] = useState(sectioned);

  return (
    <View style={{ flex: 1 }}>
      <Button label={changeList} onPress={() => setTree(retitledInSection)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        <View style={{ height: 1200 }}>
          <PluginTree root={tree} onPageCall={fn(async () => {})} />
        </View>
      </Profiler>
    </View>
  );
}

export const ChangedRowInSectionDrawsAlone: Story = {
  render: () => <SectionedList />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByText('Section two');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: changeList }));
      await canvas.findByText(retitle);
    });

    await expect(counts.ListItem?.updates).toHaveLength(1);
    await expect(counts.ListItem).toHaveProperty('mounts', 0);
  },
};

const longSectioned: WireNode = {
  ...firstPage,
  props: { appearance: 'plain', density: 'compact' },
  children: [
    sectionOf('one', issueListTree(200).children),
    sectionOf(
      'two',
      issueListTree(400)
        .children.slice(200)
        .map((child) => ({ ...child, key: `b-${child.key}` })),
    ),
  ],
};

const frame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

function scrollerIn(root: Element): HTMLElement {
  const scroller = [...root.querySelectorAll<HTMLElement>('*')].find(
    (element) =>
      element.scrollHeight > element.clientHeight + 100 &&
      /auto|scroll/.test(getComputedStyle(element).overflowY),
  );

  if (!scroller) throw new Error('No scrolling element');

  return scroller;
}

async function fling(scroller: HTMLElement): Promise<void> {
  for (let index = 0; index < 30; index += 1) {
    scroller.scrollTop += 120;
    await frame();
  }
}

// Rows scroll through the cells the list holds: a cell is reused for a row of its own type, not drawn anew.
export const RowsRecycleCells: Story = {
  render: () => (
    <View style={{ height: 700 }}>
      <Profiler id={renders.id} onRender={renders.onRender}>
        <PluginTree root={longSectioned} onPageCall={fn(async () => {})} />
      </Profiler>
    </View>
  ),
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText('Section one');
    const scroller = scrollerIn(canvasElement);

    const counts = await renders.during(canvasElement, () => fling(scroller));

    // The rows that scrolled in drew in cells that were already there, so cells mounted fewer times than they drew.
    await expect(counts.FixedListRow?.mounts).toBeLessThan(
      counts.FixedListRow?.updates.length ?? 0,
    );
  },
};

const longFlat: WireNode = {
  ...issueListTree(400),
  props: { appearance: 'plain', density: 'compact' },
};

// A flat List's rows, handed over as data, recycle cells in the same way.
export const FlatRowsRecycleCells: Story = {
  render: () => (
    <View style={{ height: 700 }}>
      <Profiler id={renders.id} onRender={renders.onRender}>
        <PluginTree root={longFlat} onPageCall={fn(async () => {})} />
      </Profiler>
    </View>
  ),
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText('PROJ-1');
    const scroller = scrollerIn(canvasElement);

    const counts = await renders.during(canvasElement, () => fling(scroller));

    await expect(counts.DataListRow?.mounts).toBeLessThan(
      counts.DataListRow?.updates.length ?? 0,
    );
  },
};

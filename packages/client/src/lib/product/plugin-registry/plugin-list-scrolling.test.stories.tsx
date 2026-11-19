import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler } from 'react';
import { View } from 'react-native';
import { expect, fn, spyOn } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { issueListTree } from './plugin-list-scrolling.mocks';
import { PluginTree } from './plugin-registry';

/*
 * A Plugin's long list scrolls rows in and out by the hundred, so what one row costs to mount, and what a change
 * above the rows makes every row do, decide whether the list keeps up with a fling. These count that work, which a
 * busy machine does not change, rather than timing it.
 */
const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ListScrolling',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const issues = issueListTree(400);

const renders = renderCounter();

function IssueList(): React.JSX.Element {
  return (
    <View style={{ height: 700 }}>
      <Profiler id={renders.id} onRender={renders.onRender}>
        <PluginTree root={issues} onPageCall={fn(async () => {})} />
      </Profiler>
    </View>
  );
}

const frame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

const settled = async (): Promise<void> => {
  for (let index = 0; index < 10; index += 1) await frame();
};

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

// How many window listeners `action` added.
async function windowListenersDuring(
  action: () => Promise<void>,
): Promise<number> {
  const add = spyOn(window, 'addEventListener');

  try {
    await action();

    return add.mock.calls.length;
  } finally {
    add.mockRestore();
  }
}

export const ScrolledRowsMountLight: Story = {
  render: () => <IssueList />,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText('PROJ-1');
    await settled();
    const scroller = scrollerIn(canvasElement);
    let listeners = 0;

    const counts = await renders.during(canvasElement, async () => {
      listeners = await windowListenersDuring(() => fling(scroller));
    });

    // The fling drew new rows.
    await expect(counts.ListItem?.mounts).toBeGreaterThan(30);
    // Their Texts and Icons share one listener for the window's size rather than adding their own.
    await expect(listeners).toBe(0);
    // A meta line its marks fit draws each once, without unseen copies to measure.
    await expect(counts.Measured).toBeUndefined();
  },
};

function labelOf(root: HTMLElement, text: string): HTMLElement {
  const label = [...root.querySelectorAll<HTMLElement>('div')].find(
    (element) => element.textContent === text,
  );

  if (!label) throw new Error(`No row ${text}`);

  return label;
}

// A real pointer moving onto each row's key in turn, then off the list.
async function hoverAcross(root: HTMLElement, rows: string[]): Promise<void> {
  for (const text of rows) {
    await browserUser.hover(labelOf(root, text));
    await settled();
  }

  await browserUser.unhover(labelOf(root, rows.at(-1) ?? ''));
  await settled();
}

/*
 * A pointer resting on a scrolling list hovers row after row. The hovered row lives above the list, so were it React
 * state there, each hover would redraw the provider and make React walk every row for the separators it covers.
 */
export const HoverLeavesTheListAlone: Story = {
  render: () => <IssueList />,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText('PROJ-1');
    await settled();

    // Counting throws when nothing redraws, so the hovers reached the rows.
    const counts = await renders.during(canvasElement, () =>
      hoverAcross(canvasElement, ['PROJ-3', 'PROJ-6']),
    );

    await expect(counts.RowHighlightProvider).toBeUndefined();
  },
};

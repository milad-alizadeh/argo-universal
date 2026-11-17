import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler } from 'react';
import { expect, waitFor } from 'storybook/test';
import { renderCounter, type RenderCounts } from '#mocks/render-counts';
import { settleLayout } from '#mocks/story-layout';
import { ListItem } from '#primitives/lists/list-item';
import { Screen } from '#primitives/scaffolds/screen';
import { List } from '../list';

const viewportHeight = 900;

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Scrolling',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide', viewportHeight);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const listLabel = 'Scrolled rows';

const rowCount = 300;

// A Plugin page of Issues: a List of children, many windows long, whose rows differ in height.
const rows = Array.from({ length: rowCount }, (_, index) => index + 1);

const renders = renderCounter('scrolled');

const unusedContainer = 'No unused container';

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

// The rows drawn, top to bottom.
const drawnRows = (scroll: HTMLElement): DOMRect[] =>
  [...scroll.querySelectorAll('[data-testid="row"]')].map((row) =>
    row.getBoundingClientRect(),
  );

// Whether rows reach the window's top, and its bottom while there is more content below it.
function fillsWindow(scroll: HTMLElement): boolean {
  const frame = scroll.getBoundingClientRect();
  const rects = drawnRows(scroll);
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  const more = scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1;

  return top <= frame.top + 1 && (!more || bottom >= frame.bottom - 1);
}

// Scrolls a window at a time, a frame apart, and says how many frames showed a gap where a row belonged.
async function scrollThrough(scroll: HTMLElement): Promise<number> {
  let gaps = 0;

  const step = Math.max(scroll.clientHeight, 300);

  for (let top = 0; top < scroll.scrollHeight; top += step) {
    scroll.scrollTop = top;
    await nextFrame();

    if (!fillsWindow(scroll)) gaps += 1;
  }

  return gaps;
}

function RowList(): React.JSX.Element {
  return (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <Screen title="Scrolled" caption="300 rows">
        <List accessibilityLabel={listLabel}>
          {rows.map((row) => (
            <ListItem
              key={row}
              testID="row"
              title={`Row ${row}`}
              description={row % 4 === 0 ? `Description ${row}` : undefined}
            />
          ))}
        </List>
      </Screen>
    </Profiler>
  );
}

interface Scrolled {
  counts: RenderCounts;
  warnings: string[];
  gaps: number;
}

async function scrolled(
  scroll: HTMLElement,
  canvas: Element,
): Promise<Scrolled> {
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]): void => {
    warnings.push(args.map(String).join(' '));
  };

  let gaps = 0;

  try {
    const counts = await renders.during(canvas, async () => {
      gaps = await scrollThrough(scroll);
    });

    return { counts, warnings, gaps };
  } finally {
    console.warn = warn;
  }
}

const mountsOf = (counts: RenderCounts, name: string): number =>
  counts[name]?.mounts ?? 0;

const updatesOf = (counts: RenderCounts, name: string): number =>
  counts[name]?.updates.length ?? 0;

interface Finder {
  findByLabelText: (label: string) => Promise<HTMLElement>;
}

async function scrollOf(canvas: Finder): Promise<HTMLElement> {
  const scroll = await canvas.findByLabelText(listLabel);
  await waitFor(() => expect(scroll.scrollHeight).toBeGreaterThan(0));
  // The frame has grown to its cap before the scroll starts.
  await nextFrame();
  await nextFrame();

  return scroll;
}

/*
 * A List of children says nothing of its rows' size, so Legend List guesses 100 pt for a row of about half: it mounts
 * too few, measures them, and mounts the rest a frame later, which is an empty row (#2263).
 */
export const ScrollingAFullLengthKeepsRowsInTheWindow: Story = {
  render: () => <RowList />,
  play: async ({ canvas, canvasElement }) => {
    const scroll = await scrollOf(canvas);
    const { gaps, warnings } = await scrolled(scroll, canvasElement);

    await expect(gaps).toBe(0);
    await expect(
      warnings.filter((text) => text.includes(unusedContainer)),
    ).toEqual([]);
  },
};

/*
 * A row mounts as it scrolls in and no more: each ListItem once at most. A cap on the List's frame follows the content's
 * length only up to the cap, so measuring rows while scrolling renders the frame no more (#2263).
 */
export const ScrollingMountsEachRowOnceAndDrawsTheFrameNoMore: Story = {
  render: () => <RowList />,
  play: async ({ canvas, canvasElement }) => {
    const scroll = await scrollOf(canvas);
    const { counts } = await scrolled(scroll, canvasElement);

    await expect(mountsOf(counts, 'ListItem')).toBeLessThanOrEqual(rowCount);
    await expect(updatesOf(counts, 'ScrollFadeList')).toBe(0);
  },
};

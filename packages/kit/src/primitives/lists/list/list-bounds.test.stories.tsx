import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { ListItem } from '#primitives/lists/list-item';
import { Screen } from '#primitives/scaffolds/screen';
import { Pill } from '#primitives/status/pill';
import { List } from './list';

const viewportHeight = 900;

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Bounds',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide', viewportHeight);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const listLabel = 'Bounded rows';

const footer = 'The last line';

// More rows than the window holds, as a page of Issues or Sessions has.
const rows = Array.from({ length: 36 }, (_, index) => index + 1);

const onScreen = (box: DOMRect): boolean =>
  box.top >= 0 && box.bottom <= viewportHeight;

/*
 * A List of children takes the window's height as its cap, which is taller than the room a Screen's
 * heading leaves it. A frame that keeps that cap hangs past the end of its pane, and the scroll
 * that reaches the list's own end stops with its last rows and its footer off the window (#1420).
 */
export const ScrollingToTheEndShowsTheEnd: Story = {
  render: () => (
    <Screen title="Bounded" caption="Rows below a heading">
      <List
        appearance="plain"
        density="compact"
        accessibilityLabel={listLabel}
        footer={footer}
      >
        {rows.map((row) => (
          <ListItem key={row} title={`Row ${row}`} subtitle={`#${row}`} />
        ))}
      </List>
    </Screen>
  ),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText(listLabel);
    await waitFor(() => expect(scroll.scrollHeight).toBeGreaterThan(0));

    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));

    await waitFor(async () => {
      for (const text of [`Row ${rows.length}`, footer]) {
        const box = canvas.getByText(text).getBoundingClientRect();

        await expect(
          { text, onScreen: onScreen(box) },
          `${text} sits at ${box.top}–${box.bottom} in a ${viewportHeight} window`,
        ).toEqual({ text, onScreen: true });
      }
    });
  },
};

// The row's own padding, which its box holds beside the half the title keeps.
const rowInset = 32;

const longTitle =
  'A row title long enough to need every pixel the line can give it';

const longLabels = [
  'needs-design-review-from-the-owner',
  'blocked-on-the-upstream-release',
  'documentation-follow-up-required',
  'performance-regression-suspected',
];

/*
 * A compact row's pills take what the title leaves, never the title's half of the line, and the row never hangs past
 * its List however many there are.
 */
export const LongPillsLeaveTheTitleHalf: Story = {
  render: () => (
    <Screen title="Bounded">
      <List appearance="plain" density="compact" accessibilityLabel={listLabel}>
        <ListItem
          title={longTitle}
          subtitle="#7"
          meta={longLabels.map((label) => (
            <Pill key={label} text={label} />
          ))}
        />
      </List>
    </Screen>
  ),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText(listLabel);
    const titleText = canvas.getByText(longTitle);
    const [count] = seen(await canvas.findAllByText(/^\+\d$/));

    await waitFor(() => {
      const ended = titleText.getBoundingClientRect();
      const row = rowOf(titleText, count ?? document.body);

      return expect(
        { titleHalf: ended.right - row.left >= row.width / 2 - rowInset },
        `title ends at ${ended.right} in a row ${row.left}–${row.right}`,
      ).toEqual({ titleHalf: true });
    });
    await expect(
      { overflows: scroll.scrollWidth > scroll.clientWidth },
      `list content is ${scroll.scrollWidth} wide in ${scroll.clientWidth}`,
    ).toEqual({ overflows: false });
  },
};

const shortTitle = 'Sync stalls';

// The row's line: the nearest box that holds both its title and its Pills.
function rowOf(title: Element, pill: Element): DOMRect {
  const box = title.parentElement ?? document.body;

  return box.contains(pill) ? box.getBoundingClientRect() : rowOf(box, pill);
}

// The nearest box that clips what it holds, which a cut Pill would run past.
function clipOf(element: Element): Element {
  const box = element.parentElement;

  if (!box) return document.body;

  return getComputedStyle(box).overflowX === 'hidden' ? box : clipOf(box);
}

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

// What a reader sees, not the copies drawn unseen to measure them.
const seen = (elements: HTMLElement[]): HTMLElement[] =>
  elements.filter(
    (element) => element.closest('[aria-hidden="true"]') === null,
  );

const seenPills = (canvas: Canvas): HTMLElement[] =>
  seen(longLabels.flatMap((label) => canvas.queryAllByText(label)));

const seenCounts = (canvas: Canvas): HTMLElement[] =>
  seen(canvas.queryAllByText(/^\+\d$/));

const runsPastItsClip = (pill: HTMLElement): boolean =>
  pill.getBoundingClientRect().right >
  clipOf(pill).getBoundingClientRect().right + 1;

/*
 * A row's label Pills show whole or not at all: as many as fit, then "+N" for the rest, never one cut at the row's
 * edge, on a phone's row and on a wide window's compact one.
 */
function pillsFoldAt(width: number): Story {
  return {
    beforeEach: () => settleLayout(width, viewportHeight),
    render: () => (
      <Screen title="Bounded">
        <List
          appearance="plain"
          density="compact"
          accessibilityLabel={listLabel}
        >
          <ListItem
            title={shortTitle}
            subtitle="#7"
            meta={longLabels.map((label) => (
              <Pill key={label} text={label} />
            ))}
          />
        </List>
      </Screen>
    ),
    play: async ({ canvas }) => {
      await waitFor(() => expect(seenCounts(canvas)).toHaveLength(1));

      const cut = seenPills(canvas)
        .filter(runsPastItsClip)
        .map((pill) => pill.textContent);

      await expect(cut).toEqual([]);
      await expect(seenPills(canvas).length).toBeLessThan(longLabels.length);
    },
  };
}

export const PillsFoldIntoACountOnAPhone = pillsFoldAt(375);

export const PillsFoldIntoACountOnAWideWindow = pillsFoldAt(1440);

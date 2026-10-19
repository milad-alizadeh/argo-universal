import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { sampleEachFrame } from '../../../../../mocks/sample-each-frame';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Feed } from './feed';
import {
  expandedAttribute,
  feedScrollId,
  openRow,
  openedRow,
  scrollAwayFromEnd,
  scrolledToEnd,
  scrollToEnd,
  scrollUp,
  settledTopOf,
} from './feed-reader.mocks';
import { longRows } from './feed.mocks';
import { feedArgs, PagedFeed } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

// Long enough for the slowest close and the frames after it.
const closingFrames = 40;

// The last two closed rows, once the open group has drawn them after its own row.
async function lastTwoRowsIn(
  group: HTMLElement,
  closedRows: () => HTMLElement[],
): Promise<[HTMLElement, HTMLElement]> {
  const inGroup = (row: HTMLElement | undefined): row is HTMLElement =>
    row !== undefined &&
    Boolean(
      group.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING,
    );

  const [trigger, below] = await waitFor(() => {
    const rows = closedRows().slice(-2);

    if (!rows.every(inGroup) || rows.length < 2)
      throw new Error('The last group has not drawn two rows');

    return rows;
  });

  if (!trigger || !below) throw new Error('No two rows in the last group');

  return [trigger, below];
}

function contentsOf(row: HTMLElement): HTMLElement {
  const contentId = row.getAttribute('aria-controls');
  const content =
    contentId && document.getElementById(contentId)?.firstElementChild;

  if (!(content instanceof HTMLElement))
    throw new Error('No content controlled by the row');

  return content;
}

// At the end, closing a row draws the rows above down into its place, while the rows below it hold still on every frame.
export const KeepsRowsBelowStillWhenRowClosesAtEnd: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));

    const closedRows = (): HTMLElement[] =>
      within(scroll).getAllByRole('button', { expanded: false });

    // The last group opens on its own rows: the reader opens one and reads on to the end, where the next one sits below it.
    const lastGroup = closedRows().at(-1);

    if (!lastGroup) throw new Error('No closed row at the end');
    await openRow(lastGroup);
    const [trigger, below] = await lastTwoRowsIn(lastGroup, closedRows);
    await openedRow(lastGroup, () => contentsOf(lastGroup));
    await openRow(trigger);
    await openedRow(trigger, () => contentsOf(trigger));
    await scrollToEnd(scroll);
    await settledTopOf(() => below);

    await expect(scrolledToEnd(scroll)).toBe(true);
    const tops = await sampleEachFrame(
      () => trigger.click(),
      () => below.getBoundingClientRect().top,
      closingFrames,
    );

    await expect(trigger).toHaveAttribute(expandedAttribute, 'false');
    await expect(tops).toEqual(tops.map(() => tops[0]));
  },
};

export const KeepsPlaceWhenRowOpens: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));

    // Away from the end, opening a row grows the Feed below it and leaves the rows above where they were.
    const closedRowInTopHalf = (): HTMLElement | undefined => {
      const view = scroll.getBoundingClientRect();

      return within(scroll)
        .queryAllByRole('button', { expanded: false })
        .find((button) => {
          const { top } = button.getBoundingClientRect();

          return top > view.top + 40 && top < view.top + view.height / 2;
        });
    };

    await scrollAwayFromEnd(canvas, scroll);

    // Reads back a third of a screen at a time until a closed row sits in the top half.
    const trigger = await waitFor(
      () => {
        const found = closedRowInTopHalf();

        if (found) return found;
        scrollUp(scroll, scroll.clientHeight / 3);
        throw new Error('No closed row in view');
      },
      { timeout: 5000, interval: 100 },
    );

    const triggerTop = trigger.getBoundingClientRect().top;
    // The trigger's collapsible, which grows as it opens.
    const collapsible = trigger.parentElement;

    if (!collapsible) throw new Error('No collapsible around the row');
    const heightBefore = collapsible.offsetHeight;
    trigger.click();
    await waitFor(() =>
      expect(trigger).toHaveAttribute(expandedAttribute, 'true'),
    );
    // Once the row stops growing, the open has finished.
    let lastHeight = heightBefore;
    await waitFor(
      async () => {
        const height = collapsible.offsetHeight;
        const stoppedGrowing = height > heightBefore && height === lastHeight;
        lastHeight = height;
        await expect(stoppedGrowing).toBe(true);
      },
      { timeout: 5000, interval: 250 },
    );
    // Legend rounds the scroll on each layout pass while the row grows, which leaves it at most a few pixels off.
    await expect(
      Math.abs(trigger.getBoundingClientRect().top - triggerTop),
    ).toBeLessThanOrEqual(3);
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

import { expect, waitFor } from 'storybook/test';
import { scrolledToEnd } from '../../src/features/feed/components/feed/feed-reader.mocks';
import { eachLayout } from '../../src/lib/generic/each-layout';
import { canPointAt } from '../point-hit';
import { feedScrollTestId, type Story } from './session-view-story.test.mocks';

interface RowQueries {
  getAllByTestId: (testId: string) => HTMLElement[];
}

const bottomOf = (row: HTMLElement): number =>
  row.getBoundingClientRect().bottom;

// The lowest row on screen, wherever the list placed it.
const lowestRow = (canvas: RowQueries): HTMLElement =>
  canvas
    .getAllByTestId('feed-column')
    .reduce((lowest, row) => (bottomOf(row) > bottomOf(lowest) ? row : lowest));

// Whether a reader can point at the row's very bottom, rather than the Composer covering it.
function bottomEdgeClear(row: HTMLElement): boolean {
  const box = row.getBoundingClientRect();

  return canPointAt(row, { x: box.left + box.width / 2, y: box.bottom - 1 });
}

// At the Feed's end, the last row rests above the Composer, which covers none of it.
export const lastRowRestsAboveTheComposer: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const scroll = await canvas.findByTestId(feedScrollTestId);
      await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
      await waitFor(() =>
        expect(bottomEdgeClear(lowestRow(canvas))).toBe(true),
      );
    }),
};

import { expect, waitFor, within } from 'storybook/test';
import { scrolledToEnd } from '../../src/features/feed/components/feed/feed-reader.mocks';
import { eachLayout } from '../../src/lib/generic/each-layout';
import { canPointAt } from '../point-hit';
import { bottomFadeStart, fadedEdges } from '../scroll-fade';
import { feedScrollTestId, type Story } from './session-view-story.test.mocks';

// Whether a reader can point at the row's very bottom, rather than the Composer covering it.
function bottomEdgeClear(row: HTMLElement): boolean {
  const box = row.getBoundingClientRect();

  return canPointAt(row, { x: box.left + box.width / 2, y: box.bottom - 1 });
}

// Whether the whole row lies above the Feed's bottom fade, so none of it is faded.
const aboveTheFade = (row: HTMLElement, scroll: HTMLElement): boolean =>
  row.getBoundingClientRect().bottom <= bottomFadeStart(scroll) + 1;

// At the Feed's end, its last line, the running Turn's status, rests whole above the Composer and the fade over it.
export const lastRowRestsAboveTheComposer: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const scroll = await canvas.findByTestId(feedScrollTestId);
      await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
      const status = within(scroll).getByRole('status');
      await waitFor(() => expect(fadedEdges(scroll).bottom).toBe(true));
      await waitFor(() => expect(bottomEdgeClear(status)).toBe(true));
      await waitFor(() => expect(aboveTheFade(status, scroll)).toBe(true));
    }),
};

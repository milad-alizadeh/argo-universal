import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { Feed } from './feed';
import {
  feedScrollId,
  markSettledMiddleOfView,
  scrolledToEnd,
  scrollToEnd,
  settleWait,
} from './feed-reader.mocks';
import { longRows, streamedRow } from './feed.mocks';
import { feedArgs, PagedFeed, sendRow } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/StreamingOpen',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const topOf = (row: HTMLElement): number => row.getBoundingClientRect().top;

// The lowest closed row whose top shows in the view.
function lowestClosedRowInView(scroll: HTMLElement): HTMLElement {
  const view = scroll.getBoundingClientRect();

  const row = within(scroll)
    .getAllByRole('button', { expanded: false })
    .filter((closed) => topOf(closed) > view.top && topOf(closed) < view.bottom)
    .sort((above, below) => topOf(below) - topOf(above))[0];

  if (!row) throw new Error('No closed row in view');

  return row;
}

/*
 * Each streamed row this long after the one before, as an Agent writes. The Feed follows only rows that
 * land while the row opens, and that opening takes a fixed time, so rows are paced in time: paced in
 * frames, a loaded runner stretches the gap past the opening and every row lands after it.
 */
const msBetweenRows = 40;

const streamedRows = 16;

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Sends the streamed rows to the end, one every few milliseconds, and resolves once the last has gone.
async function streamRows(): Promise<void> {
  for (let index = 0; index < streamedRows; index += 1) {
    sendRow(streamedRow(index));
    await pause(msBetweenRows);
  }
}

// At the end while the Agent writes, the reader opens a row: once it has opened, the Feed still follows the rows that arrive.
export const KeepsFollowingEndWhenRowOpensAsRowsStream: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const scroll = await canvas.findByTestId(feedScrollId);
    await scrollToEnd(scroll);
    // Rows at the end are still measuring after the scroll: pick one once the view holds still.
    await markSettledMiddleOfView(scroll);
    await scrollToEnd(scroll);
    const row = lowestClosedRowInView(scroll);
    const label = row.textContent;
    row.click();
    await streamRows();
    // The row may have been drawn again while rows streamed in, so read it as it is now.
    await waitFor(
      () =>
        expect(
          within(scroll)
            .getAllByRole('button', { expanded: true })
            .some((open) => open.textContent === label),
        ).toBe(true),
      settleWait,
    );
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
    await waitFor(
      () =>
        expect(
          canvas.queryByRole('button', { name: /Jump to latest/ }),
        ).toBeNull(),
      settleWait,
    );
  },
};

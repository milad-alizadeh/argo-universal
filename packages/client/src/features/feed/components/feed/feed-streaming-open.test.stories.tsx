import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Feed } from './feed';
import {
  expandedAttribute,
  feedScrollId,
  scrolledToEnd,
} from './feed-reader.mocks';
import { longRows, streamedRow } from './feed.mocks';
import { feedArgs, PagedFeed, sendRow } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed',
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

// Each streamed row a few frames after the one before, as an Agent writes.
const framesBetweenRows = 6;

const streamedRows = 16;

// Sends the streamed rows to the end, one every few frames, and resolves once the last has gone.
function streamRows(): Promise<void> {
  return new Promise((resolve) => {
    let frame = 0;

    const step = (): void => {
      if (frame % framesBetweenRows === 0)
        sendRow(streamedRow(frame / framesBetweenRows));
      frame += 1;

      if (frame < streamedRows * framesBetweenRows) requestAnimationFrame(step);
      else resolve();
    };

    requestAnimationFrame(step);
  });
}

// At the end while the Agent writes, the reader opens a row: once it has opened, the Feed still follows the rows that arrive.
export const KeepsFollowingEndWhenRowOpensAsRowsStream: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    const row = lowestClosedRowInView(scroll);
    row.click();
    await streamRows();
    await expect(row).toHaveAttribute(expandedAttribute, 'true');
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
  },
};

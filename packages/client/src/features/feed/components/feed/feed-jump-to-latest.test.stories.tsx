import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Feed } from './feed';
import {
  feedScrollId,
  markMiddleOfView,
  scrollAwayFromEnd,
  scrolledToEnd,
} from './feed-reader.mocks';
import { arrivingMessage, arrivingRow, longRows } from './feed.mocks';
import { feedArgs, PagedFeed, sendRow } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;
export default meta;
type Story = StoryObj<typeof meta>;

export const JumpsToLatest: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId(feedScrollId);
    const feed = within(scroll);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
    // The Feed settles at the end as it opens, so the reader scrolls up until it stays up.
    await scrollAwayFromEnd(canvas, scroll);
    // A row arriving while the reader is away leaves what they read where it was; rows above may still measure, so compare the screen, not scrollTop.
    const marked = markMiddleOfView(scroll);
    sendRow(arrivingRow);
    const jumpToLatest = await canvas.findByRole('button', {
      name: 'Jump to latest, new rows',
    });
    await expect(
      Math.abs(marked.element.getBoundingClientRect().top - marked.top),
    ).toBeLessThan(2);
    jumpToLatest.click();
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(await feed.findByText(arrivingMessage)).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Feed } from './feed';
import {
  earlierFeedLoadingLabel,
  feedScrollId,
  fullyInViewport,
  markSettledMiddleOfView,
  scrollAwayWait,
  scrolledToEnd,
  scrollToTop,
  scrollUp,
  settledTopOf,
} from './feed-reader.mocks';
import {
  longRows,
  oldestMessage,
  splitGroupRows,
  splitGroupStepInTail,
} from './feed.mocks';
import { feedArgs, PagedFeed, sendOlderPage } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoadingEarlier: Story = {
  args: { loadingOlder: true },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId(feedScrollId);
    scrollUp(scroll, scroll.scrollTop);
    await eachLayout(async () => {
      const indicator = await canvas.findByRole('progressbar', {
        name: earlierFeedLoadingLabel,
      });

      await waitFor(() => expect(fullyInViewport(indicator)).toBe(true));
    });
  },
};

export const PagesOlderRows: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId(feedScrollId);
    const feed = within(scroll);
    await expect(feed.queryAllByText(oldestMessage)).toHaveLength(0);
    // Reads back a screen at a time, as a reader does, until the oldest page has loaded and drawn.
    await waitFor(async () => {
      scrollUp(scroll, scroll.clientHeight);
      await expect(feed.queryAllByText(oldestMessage).length).toBeGreaterThan(
        0,
      );
    }, scrollAwayWait);
  },
};

export const KeepsPlaceWhenOlderRowsLoad: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} holdOlderPages />,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    // At the top, the page before is already on its way.
    await scrollToTop(scroll);
    await expect(
      canvas.getByRole('progressbar', { name: earlierFeedLoadingLabel }),
    ).toBeVisible();
    // A screen down, past the top group, which an older page can extend.
    scroll.scrollTop = scroll.clientHeight;
    scroll.dispatchEvent(new Event('scroll'));
    const marked = await markSettledMiddleOfView(scroll);
    const heightBefore = scroll.scrollHeight;
    sendOlderPage();
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(heightBefore),
    );
    // Older rows draw above what the reader is reading, which stays where it was once they measure.
    await markSettledMiddleOfView(scroll);
    await expect(
      Math.abs(marked.element.getBoundingClientRect().top - marked.top),
    ).toBeLessThan(2);
  },
};

// The newest page starts partway through a Tool call group, so the older page gives that group its first rows.
export const KeepsPlaceWhenOlderRowsJoinAGroup: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={splitGroupRows} holdOlderPages />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await scrollToTop(scroll);
    await expect(
      canvas.getByRole('progressbar', { name: earlierFeedLoadingLabel }),
    ).toBeVisible();
    // The reader opens the group and reads one of its commands.
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ran 10 commands' }),
    );

    const step = (): HTMLElement =>
      canvas.getByRole('button', { name: splitGroupStepInTail });

    const top = await settledTopOf(step);
    sendOlderPage();
    // The group gains its first ten commands above, stays open, and the command being read stays where it was.
    await expect(
      await canvas.findByRole('button', { name: 'Step 1' }),
    ).toBeVisible();
    await expect(Math.abs((await settledTopOf(step)) - top)).toBeLessThan(2);
  },
};

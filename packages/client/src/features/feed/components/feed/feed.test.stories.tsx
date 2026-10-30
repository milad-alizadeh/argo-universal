import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { Feed } from './feed';
import {
  driftWhileUntouched,
  earlierFeedLoadingLabel,
  feedScrollId,
  fullyInViewport,
  markSettledMiddleOfView,
  readBackToSplitGroup,
  scrollAwayWait,
  scrolledToEnd,
  scrollToTop,
  scrollUp,
  openedRow,
  settledTopOf,
} from './feed-reader.mocks';
import {
  longRows,
  olderPromptRows,
  oldestMessage,
  splitGroupRows,
  splitGroupLastStep,
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
    await eachLayout(async () => {
      await scrollToTop(scroll);

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
    await settleLayout('phone');
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
    // And they leave it there: nothing scrolls the Feed back to its newest row once the page has landed.
    await expect(await driftWhileUntouched(marked)).toBeLessThan(2);
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

// The Feed opens on a newest page with no prompt in it, so the older page carries the Turn's one prompt in from history.
export const KeepsPlaceWhenAnOlderPromptLoads: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={olderPromptRows} holdOlderPages />
  ),
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await scrollToTop(scroll);
    // A screen down from the top, where an older page draws above what is being read.
    scroll.scrollTop = scroll.clientHeight;
    scroll.dispatchEvent(new Event('scroll'));

    const marked = await markSettledMiddleOfView(scroll);
    const heightBefore = scroll.scrollHeight;
    sendOlderPage();
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(heightBefore),
    );
    // The prompt that arrived is history, not one the reader sent: it pins nothing and the Feed stays where it was.
    await expect(await driftWhileUntouched(marked)).toBeLessThan(2);
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

// The newest page starts partway through a Tool call group, so the older page gives that group its first rows.
export const KeepsPlaceWhenOlderRowsJoinAGroup: Story = {
  render: (args) => (
    <PagedFeed {...args} rows={splitGroupRows} holdOlderPages />
  ),
  play: async ({ canvas, userEvent }) => {
    const { header } = await readBackToSplitGroup(canvas);
    await expect(
      canvas.getByRole('progressbar', { name: earlierFeedLoadingLabel }),
    ).toBeVisible();
    // The reader opens the group and reads one of its commands.
    await userEvent.click(header);

    const step = (): HTMLElement =>
      canvas.getByRole('button', { name: splitGroupStepInTail });

    // The group has opened down to its last command before the older rows arrive.
    await openedRow(header, () =>
      canvas.getByRole('button', { name: splitGroupLastStep }),
    );
    const top = await settledTopOf(step);
    sendOlderPage();
    // The group gains its first ten commands above, stays open, and the command being read stays where it was.
    await expect(
      await canvas.findByRole('button', { name: 'Step 1' }),
    ).toBeVisible();
    await expect(Math.abs((await settledTopOf(step)) - top)).toBeLessThan(2);
  },
};

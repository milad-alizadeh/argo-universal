import { settleLayout } from '@repo/kit/mocks/story-layout';
import { scrollFadeLayer } from '@repo/kit/scroll-fade/scroll-fade-options';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
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
  title: 'Tests/Feed/JumpToLatest',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const JumpsToLatest: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    await settleLayout('phone');
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

// The App marks the Session seen only while the Feed's end is on screen.
export const ReportsWhetherItsEndIsShown: Story = {
  args: { onAtEndChange: fn() },
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ args, canvas }) => {
    await settleLayout('phone');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(args.onAtEndChange).toHaveBeenLastCalledWith(true);
    await scrollAwayFromEnd(canvas, scroll);
    await expect(args.onAtEndChange).toHaveBeenLastCalledWith(false);
    (await canvas.findByRole('button', { name: 'Jump to latest' })).click();
    await waitFor(() =>
      expect(args.onAtEndChange).toHaveBeenLastCalledWith(true),
    );
  },
};

const ancestorsOf = (element: HTMLElement): HTMLElement[] =>
  element.parentElement
    ? [element.parentElement, ...ancestorsOf(element.parentElement)]
    : [];

// The absolutely placed layer the button sits in, over the Feed.
function overlayOf(button: HTMLElement): HTMLElement {
  const layer = ancestorsOf(button).find(
    (ancestor) => getComputedStyle(ancestor).position === 'absolute',
  );

  if (!layer) throw new Error('Jump to latest is not laid over the Feed');

  return layer;
}

// The Feed's edge fades draw over its content; Jump to latest must stack above them, not under, so it is never washed out.
export const StacksAboveTheFeedFades: Story = {
  render: (args) => <PagedFeed {...args} rows={longRows} />,
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await scrollAwayFromEnd(canvas, scroll);
    const button = canvas.getByRole('button', { name: 'Jump to latest' });

    await expect(
      Number(getComputedStyle(overlayOf(button)).zIndex),
    ).toBeGreaterThan(scrollFadeLayer);
  },
};

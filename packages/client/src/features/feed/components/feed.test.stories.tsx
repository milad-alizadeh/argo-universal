import type { SessionUpdate } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { recordedImageUrl } from '../../../lib/product/feed-message.mocks';
import type { FeedView } from '../view/feed-view';
import { keepUnchangedItems } from '../view/keep-unchanged-items';
import { toFeedView } from '../view/to-feed-view';
import { Feed, type FeedProps } from './feed';
import {
  arrivingMessage,
  arrivingRow,
  longRows,
  longSnapshot,
  longTail,
  oldestMessage,
  pageSize,
  splitGroupRows,
  splitGroupStepInTail,
} from './feed.mocks';

const feedScrollId = 'feed-scroll';
const earlierFeedLoadingLabel = 'Loading earlier';

let releaseOlderPage = (): void => {};
// Sends the older page the Feed is waiting for.
const sendOlderPage = (): void => releaseOlderPage();
let deliverRow = (_row: SessionUpdate): void => {};
// Sends a new row to the end of the Feed, as a live change does.
const sendRow = (row: SessionUpdate): void => deliverRow(row);

interface PagedFeedProps extends FeedProps {
  rows: readonly SessionUpdate[];
  // Each older page waits until the story sends it, so the story can mark the reader's place first.
  holdOlderPages?: boolean;
}

interface HeldFeed {
  start: number;
  arrived: readonly SessionUpdate[];
  view: FeedView;
}

// The held rows drawn again, keeping each unchanged item from the view before.
function viewOf(
  previous: FeedView | null,
  rows: readonly SessionUpdate[],
  held: Omit<HeldFeed, 'view'>,
): HeldFeed {
  return {
    ...held,
    view: keepUnchangedItems(
      previous,
      toFeedView([...rows.slice(held.start), ...held.arrived], longSnapshot),
    ),
  };
}

// Opens on the newest page and prepends an older one each time the reader nears the top, as the Session does.
function PagedFeed({
  rows,
  holdOlderPages = false,
  ...props
}: PagedFeedProps): React.JSX.Element {
  const [feed, setFeed] = useState(() =>
    viewOf(null, rows, {
      start: Math.max(0, rows.length - pageSize),
      arrived: [],
    }),
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const olderInFlight = useRef(false);
  const start = useRef(feed.start);
  useEffect(() => {
    deliverRow = (row): void =>
      setFeed((held) =>
        viewOf(held.view, rows, {
          start: held.start,
          arrived: [...held.arrived, row],
        }),
      );
    return (): void => {
      deliverRow = (): void => {};
    };
  }, [rows]);
  const loadOlder = async (): Promise<void> => {
    if (olderInFlight.current || start.current === 0) return;
    olderInFlight.current = true;
    setLoadingOlder(true);
    if (holdOlderPages)
      await new Promise<void>((resolve) => {
        releaseOlderPage = resolve;
      });
    start.current = Math.max(0, start.current - pageSize);
    const nextStart = start.current;
    setFeed((held) =>
      viewOf(held.view, rows, { start: nextStart, arrived: held.arrived }),
    );
    olderInFlight.current = false;
    setLoadingOlder(false);
  };
  return (
    <Feed
      {...props}
      items={feed.view.items}
      loadingOlder={loadingOlder}
      onStartReached={() => void loadOlder()}
    />
  );
}

const meta = {
  title: 'Tests/Feed',
  component: Feed,
  parameters: { screenPreview: true },
  args: {
    items: toFeedView(longTail, longSnapshot).items,
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof Feed>;
export default meta;
type Story = StoryObj<typeof meta>;

// A loaded runner can take a few frames per scroll before the Feed answers.
const scrollAwayWait = { timeout: 15000, interval: 100 };

const scrolledToEnd = (feedScroll: HTMLElement): boolean =>
  feedScroll.scrollHeight - feedScroll.scrollTop - feedScroll.clientHeight < 2;

// Scrolls up as a reader does on the web: the wheel turning up stops the Feed following the end, which setting scrollTop alone does not.
function scrollUp(feedScroll: HTMLElement, distance: number): void {
  feedScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: -distance }));
  feedScroll.scrollTop = Math.max(0, feedScroll.scrollTop - distance);
  feedScroll.dispatchEvent(new Event('scroll'));
}

// Reads back a screen at a time to the top.
const scrollToTop = (feedScroll: HTMLElement): Promise<void> =>
  waitFor(async () => {
    scrollUp(feedScroll, feedScroll.clientHeight);
    await expect(feedScroll.scrollTop).toBe(0);
  }, scrollAwayWait);

// The reader scrolls up until the Feed stops following the end.
const scrollAwayFromEnd = (
  canvas: ReturnType<typeof within>,
  feedScroll: HTMLElement,
): Promise<void> =>
  waitFor(async () => {
    if (scrolledToEnd(feedScroll))
      scrollUp(feedScroll, feedScroll.clientHeight);
    await expect(
      canvas.getByRole('button', { name: 'Jump to latest' }),
    ).toBeVisible();
  }, scrollAwayWait);

function fullyInViewport(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return (
    box.height > 0 &&
    box.top >= 0 &&
    box.bottom <= window.innerHeight &&
    box.left >= 0 &&
    box.right <= window.innerWidth
  );
}

// The element at the middle of the Feed's view, and where its top is now.
function markMiddleOfView(feedScroll: HTMLElement): {
  element: Element;
  top: number;
} {
  const view = feedScroll.getBoundingClientRect();
  const element = document.elementFromPoint(
    view.left + view.width / 2,
    view.top + view.height / 2,
  );
  if (!element) throw new Error('Nothing in view');
  const top = element.getBoundingClientRect().top;
  return { element, top };
}

// After two frames, the browser has sent its scroll and resize events and the Feed has answered them.
const afterTwoFrames = (): Promise<void> =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

// Once rows in view stop measuring, the middle of the view holds the same element at the same place two frames apart.
function markSettledMiddleOfView(
  feedScroll: HTMLElement,
): Promise<ReturnType<typeof markMiddleOfView>> {
  let lastMark = markMiddleOfView(feedScroll);
  return waitFor(
    async () => {
      await afterTwoFrames();
      const mark = markMiddleOfView(feedScroll);
      const settled =
        mark.element === lastMark.element && mark.top === lastMark.top;
      lastMark = mark;
      if (!settled) throw new Error('Rows in view are still measuring');
      return mark;
    },
    { timeout: 5000 },
  );
}

// Where an element's top settles once it shows at its centre, unclipped, and holds still for two frames.
function settledTopOf(findElement: () => HTMLElement): Promise<number> {
  let lastTop: number | undefined;
  return waitFor(
    async () => {
      await afterTwoFrames();
      const box = findElement().getBoundingClientRect();
      const atCentre = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      const settled = findElement().contains(atCentre) && box.top === lastTop;
      lastTop = box.top;
      if (!settled) throw new Error('The element is still moving');
      return box.top;
    },
    { timeout: 5000 },
  );
}

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
      await canvas.findByRole('button', { name: 'Ran 20 commands' }),
    ).toBeVisible();
    await expect(Math.abs((await settledTopOf(step)) - top)).toBeLessThan(2);
  },
};

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
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
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

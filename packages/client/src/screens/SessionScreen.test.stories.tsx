import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../mocks/each-layout';
import {
  arrivingMessage,
  arrivingRowSessionMocks,
  emptySessionMocks,
  heldOlderPageSessionMocks,
  idleSessionMocks,
  loadingOlderSessionMocks,
  longSessionMocks,
  oldestMessage,
  runningHeader,
  runningSessionMocks,
  runningTurnNow,
  sendArrivingRow,
  sendOlderPage,
  twoSessionMocks,
} from '../../mocks/session-screen-mock';
import { SessionScreenPreview } from '../../mocks/session-screen-preview';
import {
  SessionSwitchPreview,
  switchSession,
} from '../../mocks/session-switch-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { SessionScreen } from './SessionScreen';

const meta = {
  title: 'Tests/SessionScreen',
  component: SessionScreen,
  parameters: { trpc: runningSessionMocks, screenPreview: true },
  args: { id: 'session-1', now: runningTurnNow },
  render: (args) => <SessionScreenPreview {...args} />,
} satisfies Meta<typeof SessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

// At a phone's size the Feed overflows a screen, so the reader can scroll away from the end.
async function resizeToPhoneWidth() {
  if ('__vitest_browser__' in globalThis)
    await settleViewport(layoutWidths.phone);
}

// A loaded runner can take a few frames per scroll before the Feed answers.
const scrollAwayWait = { timeout: 15000, interval: 100 };

const scrolledToEnd = (feedScroll: HTMLElement) =>
  feedScroll.scrollHeight - feedScroll.scrollTop - feedScroll.clientHeight < 2;

// Scrolls up as a reader does on the web: the wheel turning up stops the Feed following the end, which setting scrollTop alone does not.
function scrollUp(feedScroll: HTMLElement, distance: number) {
  feedScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: -distance }));
  feedScroll.scrollTop = Math.max(0, feedScroll.scrollTop - distance);
  feedScroll.dispatchEvent(new Event('scroll'));
}

function fullyInViewport(element: Element) {
  const box = element.getBoundingClientRect();
  return (
    box.height > 0 &&
    box.top >= 0 &&
    box.bottom <= window.innerHeight &&
    box.left >= 0 &&
    box.right <= window.innerWidth
  );
}

export const RunningTurn: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      const heading = await canvas.findByRole('heading', {
        name: /^Think briefly first/,
      });
      await expect(heading).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Running')).toBeVisible();
        await expect(canvas.getByText('for 4m 12s')).toBeVisible();
      } else {
        // The native header holds the plain title and two items, no status.
        await expect(
          canvas.getByRole('button', { name: 'Changes' }),
        ).toBeVisible();
        await expect(canvas.queryByText('Running')).toBeNull();
      }
      await expect(canvas.getByRole('button', { name: 'More' })).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveTextContent(
        runningHeader.text,
      );
    }),
};

export const Idle: Story = {
  parameters: { trpc: idleSessionMocks },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', {
          name: /^Without using any tools/,
        }),
      ).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Idle')).toBeVisible();
        await expect(canvas.queryByText(/^for /)).toBeNull();
      }
      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
      // The newest row sits at the bottom, above the Composer.
      await waitFor(() =>
        expect(fullyInViewport(canvas.getByText('Redraws'))).toBe(true),
      );
    }),
};

export const LoadingEarlier: Story = {
  parameters: { trpc: loadingOlderSessionMocks },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('feed-scroll');
    scrollUp(scroll, scroll.scrollTop);
    await eachLayout(async () => {
      const indicator = await canvas.findByRole('progressbar', {
        name: 'Loading earlier',
      });
      await waitFor(() => expect(fullyInViewport(indicator)).toBe(true));
    });
  },
};

export const PagesOlderRows: Story = {
  parameters: { trpc: longSessionMocks },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('feed-scroll');
    const feed = within(scroll);
    await expect(feed.queryAllByText(oldestMessage)).toHaveLength(0);
    // Reads back a screen at a time, as a reader does, until the oldest page has loaded and drawn.
    await waitFor(
      async () => {
        scrollUp(scroll, scroll.clientHeight);
        await expect(feed.queryAllByText(oldestMessage).length).toBeGreaterThan(
          0,
        );
      },
      { timeout: 15000, interval: 100 },
    );
  },
};

// The element at the middle of the Feed's view, and where its top is now.
function markMiddleOfView(feedScroll: HTMLElement) {
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
const afterTwoFrames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

// Once rows in view stop measuring, the middle of the view holds the same element at the same place two frames apart.
function markSettledMiddleOfView(feedScroll: HTMLElement) {
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

export const KeepsPlaceWhenOlderRowsLoad: Story = {
  parameters: { trpc: heldOlderPageSessionMocks },
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    // Reads back a screen at a time to the top; the page before is already on its way.
    await waitFor(
      () => {
        scrollUp(scroll, scroll.clientHeight);
        expect(scroll.scrollTop).toBe(0);
      },
      { timeout: 15000, interval: 100 },
    );
    await expect(
      canvas.getByRole('progressbar', { name: 'Loading earlier' }),
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

export const JumpsToLatest: Story = {
  parameters: { trpc: arrivingRowSessionMocks },
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    const feed = within(scroll);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
    // The Feed settles at the end as it opens, so the reader scrolls up until it stays up.
    await waitFor(async () => {
      if (scrolledToEnd(scroll)) {
        scrollUp(scroll, scroll.clientHeight);
      }
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    }, scrollAwayWait);
    // A row arriving while the reader is away leaves what they read where it was; rows above may still measure, so compare the screen, not scrollTop.
    const marked = markMiddleOfView(scroll);
    sendArrivingRow();
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
  parameters: { trpc: longSessionMocks },
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    // Away from the end, opening a row grows the Feed below it and leaves the rows above where they were.
    const closedRowInTopHalf = () => {
      const view = scroll.getBoundingClientRect();
      return within(scroll)
        .queryAllByRole('button', { expanded: false })
        .find((button) => {
          const { top } = button.getBoundingClientRect();
          return top > view.top + 40 && top < view.top + view.height / 2;
        });
    };
    // The reader scrolls up until the Feed stops following the end.
    await waitFor(async () => {
      if (scrolledToEnd(scroll)) {
        scrollUp(scroll, scroll.clientHeight);
      }
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    }, scrollAwayWait);
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
      () => {
        const height = collapsible.offsetHeight;
        const stoppedGrowing = height > heightBefore && height === lastHeight;
        lastHeight = height;
        expect(stoppedGrowing).toBe(true);
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

export const SwitchesSessions: Story = {
  parameters: { trpc: twoSessionMocks },
  render: (args) => <SessionSwitchPreview {...args} />,
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    await canvas.findByRole('heading', { name: /^Think briefly first/ });
    await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
    switchSession('session-2');
    // The next Session opens at its own newest row, with none of the last one's rows or state.
    await canvas.findByRole('heading', { name: /^Without using any tools/ });
    await expect(canvas.queryByText(/^Think briefly first/)).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
    await expect(canvas.queryByRole('status')).toBeNull();
    await waitFor(() =>
      expect(fullyInViewport(canvas.getByText('Redraws'))).toBe(true),
    );
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
  },
};

export const EmptyFeed: Story = {
  parameters: { trpc: emptySessionMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('heading', { name: 'What should we build?' }),
      ).toBeVisible();
      await expect(canvas.queryByTestId('feed-scroll')).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    }),
};

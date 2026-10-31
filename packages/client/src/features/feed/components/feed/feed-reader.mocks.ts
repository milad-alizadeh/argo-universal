import { centreOf, topmostAt } from '@repo/kit/mocks/point-hit';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor, type within } from 'storybook/test';
import { splitGroupHeader } from './feed.mocks';
import { movingMessage, rememberReadings } from './settle-failure';

export const feedScrollId = 'feed-scroll';

export const earlierFeedLoadingLabel = 'Loading earlier';

export const expandedAttribute = 'aria-expanded';

// A loaded runner can take a few frames per scroll before the Feed answers.
export const scrollAwayWait = { timeout: 15000, interval: 100 };

export const settleWait = { timeout: 5000 };

export const scrolledToEnd = (feedScroll: HTMLElement): boolean =>
  feedScroll.scrollHeight - feedScroll.scrollTop - feedScroll.clientHeight < 2;

// Scrolls up as a reader does on the web: the wheel turning up stops the Feed following the end, which setting scrollTop alone does not.
export function scrollUp(feedScroll: HTMLElement, distance: number): void {
  feedScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: -distance }));
  feedScroll.scrollTop = Math.max(0, feedScroll.scrollTop - distance);
  feedScroll.dispatchEvent(new Event('scroll'));
}

// Reads back a screen at a time to the top.
export const scrollToTop = (feedScroll: HTMLElement): Promise<void> =>
  waitFor(async () => {
    scrollUp(feedScroll, feedScroll.clientHeight);
    await afterTwoFrames();
    await expect(feedScroll.scrollTop).toBe(0);
  }, scrollAwayWait);

// The reader scrolls up until the Feed stops following the end.
export const scrollAwayFromEnd = (
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

const withinSpan = (start: number, end: number, length: number): boolean =>
  start >= 0 && end <= length;

export function fullyInViewport(element: Element): boolean {
  const box = element.getBoundingClientRect();

  return (
    box.height > 0 &&
    withinSpan(box.top, box.bottom, window.innerHeight) &&
    withinSpan(box.left, box.right, window.innerWidth)
  );
}

interface ViewMark {
  element: Element;
  top: number;
}

// The element at the middle of the Feed's view, and where its top is now.
export function markMiddleOfView(feedScroll: HTMLElement): ViewMark {
  const element = topmostAt(centreOf(feedScroll.getBoundingClientRect()));

  if (!element) throw new Error('Nothing in view');
  const top = element.getBoundingClientRect().top;

  return { element, top };
}

// After two frames, the browser has sent its scroll and resize events and the Feed has answered them.
export const afterTwoFrames = (): Promise<void> =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

const sameMark = (mark: ViewMark, lastMark: ViewMark): boolean =>
  mark.element === lastMark.element && mark.top === lastMark.top;

// Once rows in view stop measuring, the middle of the view holds the same element at the same place two frames apart.
export function markSettledMiddleOfView(
  feedScroll: HTMLElement,
): Promise<ViewMark> {
  let lastMark = markMiddleOfView(feedScroll);

  return waitFor(async () => {
    await afterTwoFrames();
    const mark = markMiddleOfView(feedScroll);
    const settled = sameMark(mark, lastMark);
    lastMark = mark;

    if (!settled) throw new Error('Rows in view are still measuring');

    return mark;
  }, settleWait);
}

// How long the Feed is watched for a scroll nobody asked for: the slide recorded in #1543 took about 1.5 seconds.
const untouchedWindow = 2000;

// The furthest a marked row moves while nothing touches the Feed.
export async function driftWhileUntouched(mark: ViewMark): Promise<number> {
  const until = performance.now() + untouchedWindow;
  let furthest = 0;

  while (performance.now() < until) {
    await afterTwoFrames();
    const drift = Math.abs(mark.element.getBoundingClientRect().top - mark.top);
    furthest = Math.max(furthest, drift);
  }

  return furthest;
}

// Waits until a reading of an element holds for two frames.
function restingOf(read: () => number): Promise<number> {
  const remember = rememberReadings();

  return waitFor(async () => {
    await afterTwoFrames();
    const value = read();
    const last = remember(value);

    if (value !== last) throw new Error(movingMessage('reading', value, last));

    return value;
  }, settleWait);
}

const bottomOf = (element: HTMLElement): number =>
  element.getBoundingClientRect().bottom;

// Waits until a row has opened down to its last item and stopped growing: its items sit in place while it opens, so only the row's own bottom shows the motion.
export async function openedRow(
  header: HTMLElement,
  lastItem: () => HTMLElement,
): Promise<void> {
  const row = header.parentElement;

  if (!row) throw new Error('No collapsible around the row header');
  await waitFor(
    () => expect(bottomOf(lastItem())).toBeLessThanOrEqual(bottomOf(row)),
    settleWait,
  );
  await restingOf(() => bottomOf(row));
}

// Opens a closed row and waits until it reads as open.
export async function openRow(row: HTMLElement): Promise<void> {
  row.click();
  await waitFor(() => expect(row).toHaveAttribute(expandedAttribute, 'true'));
}

// The reader follows what they opened down to the very end.
export const scrollToEnd = (feedScroll: HTMLElement): Promise<void> =>
  waitFor(async () => {
    feedScroll.scrollTop = feedScroll.scrollHeight;
    feedScroll.dispatchEvent(new Event('scroll'));
    await afterTwoFrames();
    await expect(scrolledToEnd(feedScroll)).toBe(true);
  }, settleWait);

interface SplitGroupAtTop {
  scroll: HTMLElement;
  header: HTMLElement;
}

// On a phone, the reader reads back from the end to the top, where the split group starts, its older rows still on their way.
export async function readBackToSplitGroup(
  canvas: ReturnType<typeof within>,
): Promise<SplitGroupAtTop> {
  await settleLayout('phone');
  const scroll = await canvas.findByTestId(feedScrollId);
  await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
  await scrollToTop(scroll);

  const header = await canvas.findByRole(
    'button',
    { name: splitGroupHeader },
    scrollAwayWait,
  );

  return { scroll, header };
}

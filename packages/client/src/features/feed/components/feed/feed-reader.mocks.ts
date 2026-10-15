import { expect, waitFor, type within } from 'storybook/test';
import {
  canPointAt,
  centreOf,
  topmostAt,
} from '../../../../../mocks/point-hit';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { splitGroupHeader } from './feed.mocks';

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
const afterTwoFrames = (): Promise<void> =>
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

// Where an element's top settles once it shows at its centre, unclipped, and holds still for two frames.
export function settledTopOf(findElement: () => HTMLElement): Promise<number> {
  let lastTop: number | undefined;

  return waitFor(async () => {
    await afterTwoFrames();
    const box = findElement().getBoundingClientRect();
    const settled = canPointAt(findElement()) && box.top === lastTop;
    lastTop = box.top;

    if (!settled) throw new Error('The element is still moving');

    return box.top;
  }, settleWait);
}

// Waits until an element, in view or not, holds still for two frames, as it does once the rows around it stop moving.
export function restingTopOf(element: HTMLElement): Promise<number> {
  let lastTop: number | undefined;

  return waitFor(async () => {
    await afterTwoFrames();
    const { top } = element.getBoundingClientRect();
    const resting = top === lastTop;
    lastTop = top;

    if (!resting) throw new Error('The element is still moving');

    return top;
  }, settleWait);
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
  await settleViewport(layoutWidths.phone);
  const scroll = await canvas.findByTestId(feedScrollId);
  await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
  await scrollToTop(scroll);

  const header = await canvas.findByRole(
    'button',
    { name: splitGroupHeader },
    scrollAwayWait,
  );

  return { scroll, header };
}

import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { heldPrefetchCount, releasePrefetches } from './feed-history-refresh';
import { When, Then } from './fixtures';

const feedScroll = 'feed-scroll';

// A row this far from its mark has moved, as a reader sees it.
const movedPixels = 2;

// The row flickers as the page lands (#1861); #1543's slide held it off its mark for over 100 frames.
const flickerFrames = 10;

// How long the Feed is watched after the older page lands: #1543's slide took about 1.5 s.
const settleMilliseconds = 2000;

interface AnchorReading {
  // How many frames the row sat further than `movedPixels` from its mark.
  driftedFrames: number;
  // How far it had moved on the latest frame.
  drift: number;
  // Whether the row is still in the document, showing what it showed when marked.
  stillShown: boolean;
}

// Runs in the page, which these steps type without the DOM library. Reads back with the wheel, which stops the Feed following its end, marks the row in the middle of the view once it holds still, and watches it every frame.
const watchAnchor = `(async () => {
  const feed = document.querySelector('[data-testid="${feedScroll}"]');
  const frame = () => new Promise(requestAnimationFrame);
  const heightBefore = feed.scrollHeight;
  const middle = () => {
    const box = feed.getBoundingClientRect();
    return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  };
  const mark = () => {
    const element = middle();
    return { element, top: element.getBoundingClientRect().top };
  };
  feed.dispatchEvent(new WheelEvent('wheel', { deltaY: -feed.clientHeight }));
  feed.scrollTop = feed.clientHeight;
  feed.dispatchEvent(new Event('scroll'));
  let marked = mark();
  for (let attempts = 60; ; attempts -= 1) {
    if (attempts === 0) throw new Error('The rows in view never stopped measuring');
    await frame();
    await frame();
    const next = mark();
    if (next.element === marked.element && next.top === marked.top) break;
    marked = next;
  }
  const text = marked.element.textContent;
  const reading = { driftedFrames: 0, drift: 0, stillShown: true, settled: false };
  window.argoAnchor = reading;
  const landed = () =>
    feed.scrollHeight - heightBefore > 1 &&
    !document.querySelector('[role="progressbar"][aria-label="Loading earlier"]');
  let landedAt;
  const watch = (now) => {
    reading.drift = Math.abs(marked.element.getBoundingClientRect().top - marked.top);
    reading.driftedFrames += Number(reading.drift > ${movedPixels});
    reading.stillShown = marked.element.isConnected && marked.element.textContent === text;
    landedAt ??= landed() ? now : undefined;
    reading.settled = landedAt !== undefined && now - landedAt >= ${settleMilliseconds};
    if (!reading.settled) requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
})()`;

const readAnchor = (page: Page): Promise<AnchorReading> =>
  page.evaluate<AnchorReading>('window.argoAnchor');

When('I read back with an older history page held', async ({ page }) => {
  await expect.poll(() => heldPrefetchCount(page)).toBeGreaterThan(0);
  await page.evaluate(watchAnchor);
});

When('the older history page lands', async ({ page }) => {
  releasePrefetches(page);
  await page.waitForFunction('window.argoAnchor.settled');
});

Then('the row I was reading stays where it was', async ({ page }) => {
  const reading = await readAnchor(page);

  expect(reading.stillShown).toBe(true);
  expect(reading.drift).toBeLessThanOrEqual(movedPixels);
  expect(reading.driftedFrames).toBeLessThanOrEqual(flickerFrames);
});

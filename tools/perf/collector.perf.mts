import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { browserScript } from './browser.mts';
import { measure } from './frames.mts';
import type { Sample } from './sample.mts';

/*
 * The frame collector's own sensitivity check (#1460). Every other scenario's frame numbers are
 * only worth what this proves: that a main thread held for `stallMilliseconds` shows up as one
 * long frame interval, and that the compositor really does report the frames it draws in headless
 * Chromium. A collector that cannot see a stall it was handed would report a clean 60 Hz through
 * a real one, which is the one direction a performance gate must not fail in. This check is
 * load-independent: the stall is a busy loop of a fixed length, so host contention can only make
 * the stalled window longer, never the clean one longer than the bound below.
 */

// Far longer than any frame, and far longer than the bound a clean window has to stay under.
const stallMilliseconds = 500;

// A clean window on a contended host still measures well under this; a seen stall is over 400 ms.
const cleanBoundMilliseconds = 250;

// Enough frames either side of the stall for an interval to span it.
const settleMilliseconds = 400;

// A page with something to draw, so the compositor has frames to report.
const content =
  '<div style="height:400vh;background:linear-gradient(red,blue)"></div>';

// A page carrying the collector, and a CDP session over it: what `measure` is handed.
async function collectorPage(page: Page): Promise<CDPSession> {
  await page.addInitScript({ content: browserScript });
  await page.setContent(content);
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');

  return session;
}

// Holds the page's main thread for `milliseconds`, as a janking render would.
const hold = (page: Page, milliseconds: number): Promise<void> =>
  page.evaluate((until) => {
    const end = performance.now() + until;

    while (performance.now() < end) {
      // Busy, on purpose.
    }
  }, milliseconds);

// One measured window with a held main thread in the middle of it.
const windowAround = (
  page: Page,
  session: CDPSession,
  stall: number,
): Promise<Sample> =>
  measure(page, session, async () => {
    await page.waitForTimeout(settleMilliseconds);
    await hold(page, stall);
    await page.waitForTimeout(settleMilliseconds);
  });

test('the frame collector sees a main thread the page holds', async ({
  page,
}) => {
  const session = await collectorPage(page);
  const clean = await windowAround(page, session, 0);
  const stalled = await windowAround(page, session, stallMilliseconds);

  // The collector is sensitive: the held main thread is one long interval, and a long task.
  expect(stalled.maxMs).toBeGreaterThan(stallMilliseconds * 0.8);
  expect(stalled.longTasks).toBeGreaterThan(0);
  // And it is not merely always large: an unheld window stays inside a frame or two.
  expect(clean.maxMs).toBeLessThan(cleanBoundMilliseconds);
  // The compositor's own report reaches the trace, so `presentedFrames` and friends mean something.
  expect(clean.presentedFrames).toBeGreaterThan(0);
});

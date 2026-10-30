import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { browserScript } from './browser.mts';
import { measure } from './frames.mts';
import type { Sample } from './sample.mts';

/*
 * The frame collector's own sensitivity checks (#1460). Every other scenario's frame numbers are
 * only worth what these prove, and a collector that cannot see a stall it was handed would report
 * a clean 60 Hz through a real one — the one direction a performance gate must not fail in.
 *
 * Both checks are differential and load-independent: each injects a stall of a fixed length and
 * compares the window against an unstalled one, so host contention can only widen the gap.
 *
 * Neither asserts a budget. What a Feed scroll may spend is a product decision nobody has taken;
 * what the instrument must be able to see is not.
 */

// Far longer than any frame, and far longer than the bound a clean window has to stay under.
const stallMilliseconds = 500;

// A clean window on a contended host still measures well under this; a seen stall is over 400 ms.
const cleanBoundMilliseconds = 250;

// Enough frames either side of the stall for an interval to span it.
const settleMilliseconds = 400;

const scrollTestId = 'collector-scroll';

// The same brisk flick the scenarios measure, over enough rows that it never reaches the end.
const scrollSpeed = 2400;

const scrollMilliseconds = 2000;

// Short enough to leave the flick running between them, long enough to miss several frames.
const scrollStallMilliseconds = 150;

const scrollStalls = 4;

const rowCount = 4000;

const row = (index: number): string =>
  `<p style="margin:0;padding:6px;border-bottom:1px solid #ccc;font:14px sans-serif">Row ${index} — lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod</p>`;

// A list with real text to lay out and paint, so the compositor has frames to report on.
const content = (): string =>
  `<div data-testid="${scrollTestId}" style="height:900px;overflow:auto">${Array.from(
    { length: rowCount },
    (_, index) => row(index),
  ).join('')}</div>`;

/*
 * A page carrying the collector, and a CDP session over it. The collector goes in with a script
 * tag rather than an init script: setContent does not re-run init scripts, so an init script
 * leaves `window.perf` undefined here, where the scenarios reach it through a real navigation.
 */
async function collectorPage(page: Page): Promise<CDPSession> {
  await page.setContent(content());
  await page.addScriptTag({ content: browserScript });
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

const flick = (page: Page): Promise<void> =>
  page.evaluate(({ id, motion }) => window.perf.flick(id, motion), {
    id: scrollTestId,
    motion: { pixelsPerSecond: scrollSpeed, duration: scrollMilliseconds },
  });

// One measured window with a held main thread in the middle of it.
const heldWindow = (
  page: Page,
  session: CDPSession,
  stall: number,
): Promise<Sample> =>
  measure(page, session, async () => {
    await page.waitForTimeout(settleMilliseconds);
    await hold(page, stall);
    await page.waitForTimeout(settleMilliseconds);
  });

// A flick, with the main thread held several times while it is still running.
async function stalledFlick(page: Page, stall: number): Promise<void> {
  const scrolling = flick(page);

  for (let index = 0; index < scrollStalls; index += 1) await hold(page, stall);
  await scrolling;
}

const scrolledWindow = (
  page: Page,
  session: CDPSession,
  stall: number,
): Promise<Sample> => measure(page, session, () => stalledFlick(page, stall));

test('the frame collector sees a main thread the page holds', async ({
  page,
}) => {
  const session = await collectorPage(page);
  const clean = await heldWindow(page, session, 0);
  const stalled = await heldWindow(page, session, stallMilliseconds);

  // The held main thread arrives as one long frame interval, not as a clean 60 Hz.
  expect(stalled.maxMs).toBeGreaterThan(stallMilliseconds * 0.8);
  // And the collector is not merely always large: an unheld window stays inside a frame or two.
  expect(clean.maxMs).toBeLessThan(cleanBoundMilliseconds);
});

/*
 * The signal the frame intervals cannot carry. A partial frame is the compositor presenting
 * without the main thread's update — over a virtualised list, that is a frame showing content the
 * page has not rendered yet, which is PF-16's blank-content criterion. The scenarios record it as
 * `partialFrames` and nothing reads it; this is the proof that it means what it claims to.
 */
test('the compositor reports the frames the main thread did not update', async ({
  page,
}) => {
  const session = await collectorPage(page);
  const clean = await scrolledWindow(page, session, 0);
  const stalled = await scrolledWindow(page, session, scrollStallMilliseconds);

  // The compositor's report reaches the trace at all, so the counts are not vacuously zero.
  expect(clean.presentedFrames).toBeGreaterThan(0);
  // A flick the main thread keeps up with presents whole frames; a stalled one presents partials.
  expect(stalled.partialFrames).toBeGreaterThan(clean.partialFrames);
  expect(stalled.compositorDropped).toBeGreaterThan(clean.compositorDropped);
});

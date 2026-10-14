import type { CDPSession, Page } from '@playwright/test';
import { browserScript } from './browser.mts';

export interface Viewport {
  width: number;
  height: number;
}

export const desktop: Viewport = { width: 1440, height: 900 };

export const phone: Viewport = { width: 390, height: 844 };

export const feedScroll = 'feed-scroll';

export const sessionsScroll = 'sessions-scroll';

// A brisk wheel or trackpad flick.
const scrollSpeed = 2400;

const scrollMilliseconds = 2000;

const pageInSettleMilliseconds = 400;

const stableChecks = 4;

// Loads the App against `serverUrl` at `viewport`, with the page helpers in place.
async function load(
  page: Page,
  serverUrl: string,
  viewport: Viewport,
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.addInitScript({ content: browserScript });
  await page.addInitScript((url) => {
    Object.assign(globalThis, { argo: { serverUrl: url } });
  }, serverUrl);
  // The static export serves only its root, so a Session opens from the list.
  await page.goto('/');
}

export interface Target {
  serverUrl: string;
  viewport: Viewport;
  session?: string;
}

// Opens the App, then the Session titled `session` when one is named; returns a CDP session on the page.
export async function openApp(page: Page, target: Target): Promise<CDPSession> {
  await load(page, target.serverUrl, target.viewport);
  const title = target.session;

  if (title !== undefined)
    await page
      .getByRole('button', { name: new RegExp(`^${title}, `, 'u') })
      .click();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');

  return cdp;
}

const flick = (
  page: Page,
  id: string,
  pixelsPerSecond: number,
): Promise<void> =>
  page.evaluate(({ testId, motion }) => window.perf.flick(testId, motion), {
    testId: id,
    motion: { pixelsPerSecond, duration: scrollMilliseconds },
  });

// One flick down the list `id`, then one back up.
export async function scrollDownAndUp(page: Page, id: string): Promise<void> {
  await flick(page, id, scrollSpeed);
  await flick(page, id, -scrollSpeed);
}

// Moves the list `id` to its top or bottom, and returns its scroll height.
export const jump = (page: Page, id: string, top: boolean): Promise<number> =>
  page.evaluate(({ testId, toTop }) => window.perf.jump(testId, toTop), {
    testId: id,
    toTop: top,
  });

// Pages in every older row or Session, so the scroll runs over the whole list.
export async function loadWholeList(
  page: Page,
  id: string,
  top: boolean,
): Promise<void> {
  const heights: number[] = [];

  while (
    new Set(heights.slice(-stableChecks)).size !== 1 ||
    heights.length < stableChecks
  ) {
    heights.push(await jump(page, id, top));
    await page.waitForTimeout(pageInSettleMilliseconds);
  }
}

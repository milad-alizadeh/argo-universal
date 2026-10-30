import type { Page } from '@playwright/test';
import { latestMessage, readinessTimeout } from './elapsed-scenario.mts';

/*
 * Waits for a condition on every rendering opportunity, so the driver clock is not rounded up to
 * a locator's retry interval. It throws Playwright's TimeoutError after the readiness timeout.
 */
export async function untilTrue(
  page: Page,
  predicate: (arg: string) => boolean,
  arg = '',
): Promise<void> {
  await page.waitForFunction<boolean, string>(predicate, arg, {
    polling: 'raf',
    timeout: readinessTimeout,
  });
}

const feedText = (wanted: string): boolean =>
  document
    .querySelector('[data-testid="feed-scroll"]')
    ?.textContent?.includes(wanted) === true;

// The Feed has drawn the text.
export const feedShows = (page: Page, text: string): Promise<void> =>
  untilTrue(page, feedText, text);

export const showsLatestMessage = (page: Page): Promise<void> =>
  feedShows(page, latestMessage);

const composerDrawn = (): boolean => {
  const input = document.querySelector(
    '[role="textbox"][aria-label="Message"]',
  );

  return (
    input !== null &&
    input.getBoundingClientRect().height > 0 &&
    input.getAttribute('aria-disabled') !== 'true'
  );
};

// The Composer is drawn and not disabled.
export const composerUsable = (page: Page): Promise<void> =>
  untilTrue(page, composerDrawn);

const composerText = (wanted: string): boolean =>
  document.querySelector('[role="textbox"][aria-label="Message"]')
    ?.textContent === wanted;

// The Composer's text is exactly `text`.
export const composerHolds = (page: Page, text: string): Promise<void> =>
  untilTrue(page, composerText, text);

const listedRow = (id: string): boolean =>
  document.querySelector(`[data-testid="${id}"] [role="button"]`) !== null;

// The Sessions list has drawn a row.
export const sessionsListed = (page: Page): Promise<void> =>
  untilTrue(page, listedRow, 'sessions-scroll');

function isBannerText(text: string): boolean {
  return text.length < 80 && /^(Reconnecting…|Can't reach .+)$/u.test(text);
}

function isDrawn(element: Element | null): boolean {
  return (element?.getClientRects().length ?? 0) > 0;
}

function isBannerNode(node: Node): boolean {
  return isBannerText(String(node.textContent)) && isDrawn(node.parentElement);
}

function textNodes(): Node[] {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  let node = walker.nextNode();

  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  return nodes;
}

function bannerShown(): boolean {
  return textNodes().some(isBannerNode);
}

const bannerScript = [
  isBannerText,
  isDrawn,
  isBannerNode,
  textNodes,
  bannerShown,
]
  .map(String)
  .join('\n');

/*
 * Whether the Connection banner is on screen: the App says it is reconnecting or cannot reach the
 * Server. Every page in a section's stack has one, so only a drawn one counts.
 */
async function untilBanner(page: Page, shown: boolean): Promise<void> {
  const negation = shown ? '' : '!';

  await page.waitForFunction(
    `(() => { ${bannerScript}\nreturn ${negation}bannerShown(); })()`,
    undefined,
    { polling: 'raf', timeout: readinessTimeout },
  );
}

export const bannerGone = (page: Page): Promise<void> =>
  untilBanner(page, false);

export const bannerUp = (page: Page): Promise<void> => untilBanner(page, true);

import type { CDPSession, Locator, Page } from '@playwright/test';
import {
  feedScroll,
  loadWholeList,
  reopenSession,
  type Scenario,
  scrollDownAndUp,
} from './page.mts';

// Long enough for a collapsible to finish opening or closing, and for the rows below it to settle.
const motionSettleMilliseconds = 400;

// How many of the Feed's collapsibles one pass opens and closes.
const toggledCollapsibles = 6;

// Long enough for the rows the Session opens on to measure.
const feedSettleMilliseconds = 1500;

// A prompt the fixture Agent answers with rows of its own.
export const streamedPrompt = 'Run the checks';

// Far longer than a Turn takes, even at the heaviest CPU slowdown.
export const turnTimeoutMilliseconds = 120_000;

// The long Session, and how to open it on a page.
export interface FeedTarget {
  open: (page: Page) => Promise<CDPSession>;
  title: () => string;
}

const settledFeed = async (page: Page): Promise<void> => {
  await page.getByTestId(feedScroll).waitFor();
  await page.waitForTimeout(feedSettleMilliseconds);
};

// Flicks down and up the long Session's whole Feed.
const feed =
  (target: FeedTarget): Scenario =>
  async (page) => {
    const session = await target.open(page);
    await page.getByTestId(feedScroll).waitFor();
    await loadWholeList(page, feedScroll, true);

    return { session, once: () => scrollDownAndUp(page, feedScroll) };
  };

const toggleCollapsible = async (
  page: Page,
  collapsible: Locator,
): Promise<void> => {
  await collapsible.click();
  await page.waitForTimeout(motionSettleMilliseconds);
};

const toggleEach = async (page: Page, collapsibles: Locator): Promise<void> => {
  for (let index = 0; index < toggledCollapsibles; index += 1) {
    await toggleCollapsible(page, collapsibles.nth(index));
    await toggleCollapsible(page, collapsibles.nth(index));
  }
};

/*
 * Opens and closes the Feed's first collapsibles, one at a time. Each is closed again before the
 * next is opened, so the Feed keeps its shape and the next index is still the next collapsible.
 */
const expand =
  (target: FeedTarget): Scenario =>
  async (page) => {
    const session = await target.open(page);
    await settledFeed(page);

    const collapsibles = page
      .getByTestId(feedScroll)
      .locator('[aria-expanded]');

    return { session, once: () => toggleEach(page, collapsibles) };
  };

const openFromCold = async (page: Page, title: string): Promise<void> => {
  await reopenSession(page, title);
  await page.getByTestId(feedScroll).waitFor();
};

/*
 * Opens the long Session from cold each pass, then pages its whole Feed in from the top. The
 * reopening is the pass's setup, not part of it: a reload empties the recorder counting frames.
 */
const paging =
  (target: FeedTarget): Scenario =>
  async (page) => {
    const session = await target.open(page);
    await settledFeed(page);

    return {
      session,
      before: () => openFromCold(page, target.title()),
      once: () => loadWholeList(page, feedScroll, true),
    };
  };

const runTurn = async (page: Page): Promise<void> => {
  await page.getByRole('textbox', { name: 'Message' }).fill(streamedPrompt);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page
    .getByRole('button', { name: 'Stop', exact: true })
    .waitFor({ state: 'detached', timeout: turnTimeoutMilliseconds });
};

// Sends a prompt into the long Session and measures the Feed while the Turn's rows stream in.
const streaming =
  (target: FeedTarget): Scenario =>
  async (page) => {
    const session = await target.open(page);
    await settledFeed(page);

    return { session, once: () => runTurn(page) };
  };

// Everything measured in a Session's Feed: scrolling it, opening its rows, paging it, streaming into it.
export interface FeedScenarios {
  feed: Scenario;
  expand: Scenario;
  paging: Scenario;
  streaming: Scenario;
}

export const feedScenarios = (target: FeedTarget): FeedScenarios => ({
  feed: feed(target),
  expand: expand(target),
  paging: paging(target),
  streaming: streaming(target),
});

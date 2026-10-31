import type { Page } from '@playwright/test';
import { sharedReply } from '@repo/mocks/agent/scenarios';
import { composerUsable } from './driver-wait.mts';
import {
  type DriverAction,
  type ElapsedScenario,
} from './elapsed-scenario.mts';
import { streamedPrompt, turnTimeoutMilliseconds } from './feed-scenarios.mts';
import { desktop, openApp } from './page.mts';
import { sessionTitle } from './seed-sessions.mts';
import type { SeededServer } from './seed.mts';

const send = (page: Page): Promise<void> =>
  page.getByRole('button', { name: 'Send', exact: true }).click();

// Session `index` + 1 of the seeded list, one per page; Session 0 holds the long Feed and is left out.
async function openOn(
  page: Page,
  server: SeededServer,
  index: number,
): Promise<void> {
  await openApp(page, {
    serverUrl: server.serverUrl,
    viewport: desktop,
    session: sessionTitle(index + 1),
  });
}

async function openPages(
  main: Page,
  server: SeededServer,
  count: number,
): Promise<Page[]> {
  const extra = Array.from({ length: count - 1 }, () =>
    main.context().newPage(),
  );

  const pages = [main, ...(await Promise.all(extra))];

  await Promise.all(pages.map((page, index) => openOn(page, server, index)));

  return pages;
}

async function typePrompt(page: Page, prompt: string): Promise<void> {
  await composerUsable(page);
  await page.getByRole('textbox', { name: 'Message' }).fill(prompt);
}

// Function declarations, because the wait below sends their source to the page by name.
function feedText(): string {
  return (
    document.querySelector('[data-testid="feed-scroll"]')?.textContent ?? ''
  );
}

function stopDrawn(): boolean {
  return [...document.querySelectorAll('[role="button"][aria-label]')].some(
    (element) => element.getAttribute('aria-label') === 'Stop',
  );
}

function followsPrompt(text: string, prompt: string, reply: string): boolean {
  return (
    text.includes(prompt) &&
    text.slice(text.lastIndexOf(prompt)).includes(reply)
  );
}

const answeredScript = [feedText, stopDrawn, followsPrompt]
  .map(String)
  .join('\n');

/*
 * Each trial's prompt is new, because a Feed holds only the rows near its end: counting replies
 * stops growing once older ones leave the page.
 *
 * Stop is not a signal to wait for. The scripted Turn can answer without Stop ever being drawn (the
 * first Turn on a page did, with the Feed holding the reply), so a wait for Stop to appear never
 * returns. When it is drawn it stays about 60 ms, which a polling locator misses as well.
 */
async function finished(page: Page, prompt: string): Promise<void> {
  const asked = JSON.stringify(prompt);
  const reply = JSON.stringify(sharedReply);

  await page.waitForFunction(
    `(() => { ${answeredScript}\nreturn followsPrompt(feedText(), ${asked}, ${reply}) && !stopDrawn(); })()`,
    undefined,
    { polling: 'raf', timeout: turnTimeoutMilliseconds },
  );
}

let turns = 0;

async function prepareTurns(pages: Page[]): Promise<DriverAction> {
  turns += 1;
  const prompt = `${streamedPrompt} (${turns})`;

  await Promise.all(pages.map((page) => typePrompt(page, prompt)));

  return {
    dispatch: async () => {
      await Promise.all(pages.map(send));
    },
    ready: async () => {
      await Promise.all(pages.map((page) => finished(page, prompt)));
    },
  };
}

/*
 * The App and Server half of PF-13: `count` Sessions each take the same prompt at once, each in
 * its own page. The Agent is scripted, so this is not PF-13: it carries no real queue delay,
 * provider contention, CPU or memory per Session, and only the slowest Session's finish is timed.
 */
export async function concurrentTurns(
  page: Page,
  server: SeededServer,
  count: number,
): Promise<ElapsedScenario> {
  const pages = await openPages(page, server, count);

  return {
    condition: 'warm',
    boundary: `Send pressed together in ${count} Session${count === 1 ? '' : 's'} with the scripted fixture Agent → this Turn's prompt answered with the fixture's reply in the Feed and Stop not drawn, on every page, so the slowest Session's Turn; not a real Agent, per-Session timings and resource use are not recorded`,
    driverOnly: true,
    unthrottled: 'Only the first page is slowed by browser CPU emulation',
    prepare: () => prepareTurns(pages),
  };
}

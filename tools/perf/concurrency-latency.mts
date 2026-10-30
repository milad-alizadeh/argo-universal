import type { Locator, Page } from '@playwright/test';
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

const stop = (page: Page): Locator =>
  page.getByRole('button', { name: 'Stop', exact: true });

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

async function typePrompt(page: Page): Promise<void> {
  await composerUsable(page);
  await page.getByRole('textbox', { name: 'Message' }).fill(streamedPrompt);
}

// The Turn is running once Stop is drawn and finished once it is gone again.
async function finished(page: Page): Promise<void> {
  const options = { timeout: turnTimeoutMilliseconds };

  await stop(page).waitFor({ state: 'attached', ...options });
  await stop(page).waitFor({ state: 'detached', ...options });
}

async function prepareTurns(pages: Page[]): Promise<DriverAction> {
  await Promise.all(pages.map(typePrompt));

  return {
    dispatch: async () => {
      await Promise.all(pages.map(send));
    },
    ready: async () => {
      await Promise.all(pages.map(finished));
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
    boundary: `Send pressed together in ${count} Session${count === 1 ? '' : 's'} with the scripted fixture Agent → Stop drawn and then gone on every page, so the slowest Session's Turn; not a real Agent, per-Session timings and resource use are not recorded`,
    driverOnly: true,
    unthrottled: 'Only the first page is slowed by browser CPU emulation',
    prepare: () => prepareTurns(pages),
  };
}

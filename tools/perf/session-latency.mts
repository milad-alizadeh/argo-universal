import { expect, type Locator, type Page } from '@playwright/test';
import {
  type ElapsedScenario,
  hasLatestMessage,
  latestMessage,
  scrollMetrics,
  type TimedAction,
} from './elapsed-scenario.mts';
import { desktop, feedScroll, openApp, openSession } from './page.mts';
import type { SeededServer } from './seed.mts';

async function openLong(page: Page, server: SeededServer): Promise<void> {
  await openSession(page, server.longSessionTitle);
  await hasLatestMessage(page);
  await page.getByRole('textbox', { name: 'Message' }).waitFor();
}

async function selectOther(
  page: Page,
  server: SeededServer,
  reload: boolean,
): Promise<void> {
  if (reload) await page.goto('/');
  else {
    await openSession(page, server.shortSessionTitle);
    await expect(page.getByTestId(feedScroll)).not.toContainText(latestMessage);
  }
}

const sessionRow = (page: Page, title: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${title}, `, 'u') });

async function prepareOpen(
  page: Page,
  server: SeededServer,
  reload: boolean,
): Promise<TimedAction> {
  await selectOther(page, server, reload);

  const row = sessionRow(page, server.longSessionTitle);

  await row.waitFor();

  return {
    event: 'pointerdown',
    readiness: { kind: 'feed', text: latestMessage },
    dispatch: () => row.click(),
  };
}

export async function sessionOpen(
  page: Page,
  server: SeededServer,
  reload: boolean,
): Promise<ElapsedScenario> {
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });

  return {
    condition: reload ? 'document-reload' : 'warm',
    boundary:
      'Session row pointerdown → distinctive latest recorded Feed text and enabled Composer; reload keeps browser and Server processes/caches warm',
    prepare: () => prepareOpen(page, server, reload),
  };
}

async function jumpToStart(page: Page): Promise<void> {
  await page.getByTestId(feedScroll).evaluate((element) => {
    element.scrollTop = 0;
  });
}

async function preparePage(
  page: Page,
  server: SeededServer,
): Promise<TimedAction> {
  await page.goto('/');
  await openLong(page, server);
  const earlier = page.getByRole('progressbar', { name: 'Loading earlier' });
  await expect(earlier).toHaveCount(0);
  const { height } = await scrollMetrics(page, feedScroll);

  return {
    event: 'scroll',
    readiness: { kind: 'older-page', testId: feedScroll, height },
    dispatch: () => jumpToStart(page),
  };
}

export async function paging(
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> {
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });

  return {
    condition: 'document-reload',
    boundary:
      'Scroll boundary event → increased Feed extent with no Loading earlier indicator; UI materialization, not individual network phases or full-history completion',
    prepare: () => preparePage(page, server),
  };
}

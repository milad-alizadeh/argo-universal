import type { CDPSession, Page } from '@playwright/test';
import {
  composerHolds,
  composerUsable,
  sessionsListed,
  showsLatestMessage,
} from './driver-wait.mts';
import type { DriverAction, ElapsedScenario } from './elapsed-scenario.mts';
import { desktop, openApp, openSession } from './page.mts';
import type { SeededServer } from './seed.mts';

const draft = 'PERF_DRAFT_1320 ship on friday';

// The long Session open, with its latest Feed text drawn and its Composer usable.
export async function openLong(
  page: Page,
  server: SeededServer,
): Promise<void> {
  await openApp(page, {
    serverUrl: server.serverUrl,
    viewport: desktop,
    session: server.longSessionTitle,
  });
  await showsLatestMessage(page);
  await composerUsable(page);
}

/*
 * A cold App: no HTTP cache and no stored data for the App's origin, from a blank document. The
 * browser process and the Server stay warm, so this is a cold App, not a cold launch of either.
 */
async function coldDocument(page: Page, cdp: CDPSession): Promise<void> {
  const { origin } = new URL(page.url());

  await page.goto('about:blank');
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
}

// Opens the long Session from its row once the list is drawn.
async function sessionUsable(page: Page, server: SeededServer): Promise<void> {
  await sessionsListed(page);
  await openSession(page, server.longSessionTitle);
  await showsLatestMessage(page);
  await composerUsable(page);
}

const navigate = (page: Page, ready: () => Promise<void>): DriverAction => ({
  dispatch: async () => {
    await page.goto('/', { waitUntil: 'commit' });
  },
  ready,
});

const coldBoundary = (composer: boolean): string =>
  `Navigation commit from a blank document with the HTTP cache and the origin's stored data cleared → ${composer ? 'the long Session opened from its row, latest Feed text drawn, Composer enabled' : 'the first Sessions list row drawn'}; the Server and browser processes are warm; first frame is not separated out; includes automation round trips`;

const coldReady = (
  page: Page,
  server: SeededServer,
  composer: boolean,
): (() => Promise<void>) =>
  composer
    ? (): Promise<void> => sessionUsable(page, server)
    : (): Promise<void> => sessionsListed(page);

async function launchCold(
  page: Page,
  server: SeededServer,
  composer: boolean,
): Promise<ElapsedScenario> {
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });
  const cdp = await page.context().newCDPSession(page);
  const ready = coldReady(page, server, composer);

  return {
    condition: 'cold-cache',
    boundary: coldBoundary(composer),
    driverOnly: true,
    prepare: () => prepareCold(page, cdp, ready),
  };
}

async function prepareCold(
  page: Page,
  cdp: CDPSession,
  ready: () => Promise<void>,
): Promise<DriverAction> {
  await coldDocument(page, cdp);

  return navigate(page, ready);
}

export const appLaunchList = (
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> => launchCold(page, server, false);

export const appLaunchComposer = (
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> => launchCold(page, server, true);

// The draft is saved on this Device a moment after it is typed, so wait until it is stored.
async function typeDraft(page: Page): Promise<void> {
  const input = page.getByRole('textbox', { name: 'Message' });

  await input.fill('');
  await input.fill(draft);
  await page.waitForFunction(
    (text) => JSON.stringify(localStorage).includes(text),
    draft,
    { timeout: 10_000 },
  );
}

async function reopened(page: Page, server: SeededServer): Promise<void> {
  await sessionUsable(page, server);
  await composerHolds(page, draft);
}

const reopenBoundary =
  'Navigation commit after the document was closed with a draft typed → the long Session opened from its row, latest Feed text drawn, Composer enabled and holding the draft exactly; HTTP cache and Server warm; includes the row press and automation round trips';

async function prepareReopen(
  page: Page,
  server: SeededServer,
): Promise<DriverAction> {
  await typeDraft(page);
  await page.goto('about:blank');

  return navigate(page, () => reopened(page, server));
}

/*
 * PF-02, window reopen: the document is closed with a draft in the Composer and opened again. The
 * native App's foreground resume has no web equivalent and is not measured here.
 */
export async function windowReopen(
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> {
  await openLong(page, server);

  return {
    condition: 'document-reload',
    boundary: reopenBoundary,
    driverOnly: true,
    prepare: () => prepareReopen(page, server),
  };
}

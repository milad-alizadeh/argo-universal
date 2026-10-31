import type { Page } from '@playwright/test';
import { startAnchorWatch, type AnchorReading } from './anchor-probe.mts';
import { hasLatestMessage, readinessTimeout } from './elapsed-scenario.mts';
import { feedScroll, openApp, openSession, desktop } from './page.mts';
import type { SeededServer } from './seed.mts';

// The scenario's name, in a report and in PERF_ONLY.
export const anchorScenario = 'feed-anchor-drift';

// The older page lands once its rows are in; the Feed is then watched this long for a scroll nobody asked for.
const settleMilliseconds = 2000;

// Longest the Server's replies are held while the row is marked; the tRPC socket drops a connection silent for longer than a second.
const holdLimitMilliseconds = 800;

export type AnchorTrial =
  | ({ status: 'measured' } & AnchorReading)
  | { status: 'failed'; error: string };

/*
 * Holds back what the Server sends the page while the row is marked, so the older page cannot land
 * before it, and lets it through when told to. Messages the page sends are never held.
 */
export interface ServerHold {
  start: () => void;
  release: () => void;
}

export async function holdServer(
  page: Page,
  server: SeededServer,
): Promise<ServerHold> {
  const held: (() => void)[] = [];
  let holding = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const release = (): void => {
    holding = false;
    clearTimeout(timer);

    for (const send of held.splice(0)) send();
  };

  await page.routeWebSocket(
    (url) => url.href.startsWith(server.serverUrl),
    (socket) => {
      const upstream = socket.connectToServer();
      socket.onMessage((message) => upstream.send(message));
      upstream.onMessage((message) => {
        if (holding) held.push(() => socket.send(message));
        else socket.send(message);
      });
    },
  );

  return {
    start: () => {
      holding = true;
      timer = setTimeout(release, holdLimitMilliseconds);
    },
    release,
  };
}

async function openLong(page: Page, server: SeededServer): Promise<void> {
  await page.goto('/');
  await openSession(page, server.longSessionTitle);
  await hasLatestMessage(page);
  await page.getByRole('textbox', { name: 'Message' }).waitFor();
  await page
    .getByRole('progressbar', { name: 'Loading earlier' })
    .waitFor({ state: 'detached' });
}

async function watched(page: Page): Promise<AnchorReading> {
  await page.waitForFunction(() => window.argoAnchor?.result, undefined, {
    timeout: readinessTimeout + settleMilliseconds,
  });
  const reading = await page.evaluate(() => window.argoAnchor?.result);

  if (!reading) throw new Error('The anchor reading was not recorded');

  return reading;
}

// One trial: open the long Session from cold, read back to just below its oldest rows, and watch one row as the older page lands.
export async function anchorTrial(
  page: Page,
  server: SeededServer,
  hold: ServerHold,
): Promise<AnchorTrial> {
  try {
    await openLong(page, server);
    hold.start();

    await page.evaluate(startAnchorWatch, {
      testId: feedScroll,
      settleMs: settleMilliseconds,
      loadingLabel: 'Loading earlier',
    });
    hold.release();

    return { status: 'measured', ...(await watched(page)) };
  } catch (error) {
    hold.release();

    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// The App against the seeded Server at the desktop width, ready for trials.
export async function openAnchorPage(
  page: Page,
  server: SeededServer,
): Promise<ServerHold> {
  const hold = await holdServer(page, server);
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });

  return hold;
}

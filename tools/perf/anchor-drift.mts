import type { Page } from '@playwright/test';
import {
  type AnchorOptions,
  type AnchorReading,
  anchorScript,
} from './anchor-probe.mts';
import { hasLatestMessage, readinessTimeout } from './elapsed-scenario.mts';
import { desktop, feedScroll, openApp, openSession } from './page.mts';
import type { SeededServer } from './seed.mts';
import { holdServer, type ServerHold } from './server-hold.mts';

// The scenario's name, in a report and in PERF_ONLY.
export const anchorScenario = 'feed-anchor-drift';

// The older page lands once its rows are in; the Feed is then watched this long for a scroll nobody asked for.
const settleMilliseconds = 2000;

const anchorOptions: AnchorOptions = {
  testId: feedScroll,
  settleMs: settleMilliseconds,
  loadingLabel: 'Loading earlier',
  movedPx: 2,
  settleAttempts: 60,
};

export type AnchorTrial =
  | ({ status: 'measured' } & AnchorReading)
  | { status: 'failed'; error: string };

async function openLong(page: Page, server: SeededServer): Promise<void> {
  await page.goto('/');
  await openSession(page, server.longSessionTitle);
  await hasLatestMessage(page);
  await page.getByRole('textbox', { name: 'Message' }).waitFor();
  await page
    .getByRole('progressbar', { name: 'Loading earlier' })
    .waitFor({ state: 'detached' });
}

// The long Session open, with the probe in the page.
async function openedLong(page: Page, server: SeededServer): Promise<void> {
  await openLong(page, server);
  await page.addScriptTag({ content: anchorScript });
}

async function watched(page: Page): Promise<AnchorReading> {
  await page.waitForFunction(() => window.argoAnchor?.result, undefined, {
    timeout: readinessTimeout + settleMilliseconds,
  });
  const reading = await page.evaluate(() => window.argoAnchor?.result);

  if (!reading) throw new Error('The anchor reading was not recorded');

  return reading;
}

async function watchLanding(
  page: Page,
  hold: ServerHold,
): Promise<AnchorReading> {
  hold.start();

  try {
    await page.evaluate(
      (options) => window.startAnchorWatch(options),
      anchorOptions,
    );
  } finally {
    hold.release();
  }

  return watched(page);
}

// One trial: open the long Session from cold, read back to just below its oldest rows, and watch one row as the older page lands.
export async function anchorTrial(
  page: Page,
  server: SeededServer,
  hold: ServerHold,
): Promise<AnchorTrial> {
  try {
    await openedLong(page, server);

    return { status: 'measured', ...(await watchLanding(page, hold)) };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Not an Error',
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

// Throttles the page to `rate` for the trials `measure` runs, and restores it after.
export async function throttled<Value>(
  page: Page,
  rate: number,
  measure: () => Promise<Value>,
): Promise<Value> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });

  try {
    return await measure();
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await cdp.detach();
  }
}

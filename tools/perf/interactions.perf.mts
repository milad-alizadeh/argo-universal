import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { feedScenarios } from './feed-scenarios.mts';
import {
  desktop,
  feedScroll,
  jump,
  loadWholeList,
  type Measured,
  openApp,
  phone,
  type Scenario,
  scrollDownAndUp,
  sessionsScroll,
} from './page.mts';
import {
  cpuRates,
  type Measurement,
  report,
  type Result,
  run,
  wanted,
} from './results.mts';
import { type SeededServer, startSeededServer } from './seed.mts';

const toggleSettleMilliseconds = 330;

const drawerSettleMilliseconds = 600;

const sidebarToggles = 6;

const drawerCycles = 3;

const openNavigation = 'Open navigation';

// The front drawer's scrim, which react-native-drawer-layout labels for its own close affordance.
const closeNavigation = 'Close drawer';

/*
 * The strip of the page the drawer leaves showing beside it (use-phone-drawer-width.ts). The scrim
 * spans the window, but the drawer covers its middle, so the tap that dismisses it lands here.
 */
const visibleStripWidth = 64;

const results: Result[] = [];

let server: SeededServer;

// Not serial: one scenario's failure must not silently void the scenarios queued behind it.
test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
  server = await startSeededServer(
    await mkdtemp(path.join(os.tmpdir(), 'argo-perf-server-')),
  );
  console.log(
    `Seeded ${server.sessionCount} Sessions and ${server.feedRowCount} Feed rows`,
  );
});

test.afterAll(async () => {
  await server.stop();
  await report(results, {
    sessions: server.sessionCount,
    feedRows: server.feedRowCount,
  });
});

const toggleSidebar = async (page: Page, index: number): Promise<void> => {
  const name = index % 2 ? 'Show sidebar' : 'Hide sidebar';
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(toggleSettleMilliseconds);
};

const openLongSession = (page: Page): Promise<CDPSession> =>
  openApp(page, {
    serverUrl: server.serverUrl,
    viewport: desktop,
    session: server.longSessionTitle,
  });

// Hides and shows the desktop sidebar in the long Session.
const sidebar: Scenario = async (page) => {
  const session = await openLongSession(page);
  await page.getByTestId(feedScroll).waitFor();
  await page.waitForTimeout(1500);

  const once = async (): Promise<void> => {
    for (let index = 0; index < sidebarToggles; index += 1)
      await toggleSidebar(page, index);
  };

  return { session, once };
};

// Flicks down and up the whole Sessions list.
const sessions: Scenario = async (page) => {
  const session = await openApp(page, {
    serverUrl: server.serverUrl,
    viewport: desktop,
  });

  await page.getByTestId(sessionsScroll).waitFor();
  await loadWholeList(page, sessionsScroll, false);
  await jump(page, sessionsScroll, true);

  return { session, once: () => scrollDownAndUp(page, sessionsScroll) };
};

const cycleDrawer = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: openNavigation }).click();
  await page.waitForTimeout(drawerSettleMilliseconds);
  await page.getByRole('button', { name: closeNavigation }).click({
    position: {
      x: phone.width - visibleStripWidth / 2,
      y: phone.height / 2,
    },
  });
  await page.waitForTimeout(drawerSettleMilliseconds);
};

// Opens and closes the phone drawer.
const drawer: Scenario = async (page) => {
  const session = await openApp(page, {
    serverUrl: server.serverUrl,
    viewport: phone,
  });

  await page.getByRole('button', { name: openNavigation }).waitFor();
  await page.waitForTimeout(1000);

  const once = async (): Promise<void> => {
    for (let index = 0; index < drawerCycles; index += 1)
      await cycleDrawer(page);
  };

  return { session, once };
};

const scenarios = new Map<string, Scenario>(
  Object.entries({
    sidebar,
    sessions,
    drawer,
    ...feedScenarios({
      open: openLongSession,
      title: () => server.longSessionTitle,
    }),
  }),
);

// What `run` is handed: a scenario with no setup leaves `before` out rather than passing an undefined one.
function measurement(
  scenario: Measured,
  where: { page: Page; interaction: string; cpu: number },
): Measurement {
  const { session, once, before } = scenario;

  return { ...where, session, once, ...(before && { before }) };
}

// Warms the code paths and caches with a first pass, then measures.
async function measureScenario(
  page: Page,
  interaction: string,
  cpu: number,
): Promise<Result> {
  const scenario = scenarios.get(interaction);

  if (!scenario) throw new Error(`No ${interaction} scenario`);
  const started = await scenario(page);

  await started.before?.();
  await started.once();

  return run(measurement(started, { page, interaction, cpu }));
}

for (const cpu of cpuRates)
  for (const interaction of [...scenarios.keys()].filter(wanted))
    test(`${interaction} at ${cpu}x CPU`, async ({ page }) => {
      const result = await measureScenario(page, interaction, cpu);
      results.push(result);
      expect(result.median.fps).toBeGreaterThan(0);
    });

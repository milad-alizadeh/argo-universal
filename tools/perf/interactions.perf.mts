import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type CDPSession, expect, type Page, test } from '@playwright/test';
import {
  desktop,
  feedScroll,
  jump,
  loadWholeList,
  openApp,
  phone,
  scrollDownAndUp,
  sessionsScroll,
} from './page.mts';
import { cpuRates, report, type Result, run, wanted } from './results.mts';
import { type SeededServer, startSeededServer } from './seed.mts';

const toggleSettleMilliseconds = 330;
const drawerSettleMilliseconds = 600;
const sidebarToggles = 6;
const drawerCycles = 3;
const openNavigation = 'Open navigation';

const results: Result[] = [];
let server: SeededServer;

test.describe.configure({ mode: 'serial' });

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

type Scenario = (
  page: Page,
) => Promise<{ session: CDPSession; once: () => Promise<void> }>;

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

// Flicks down and up the long Session's whole Feed.
const feed: Scenario = async (page) => {
  const session = await openLongSession(page);
  await page.getByTestId(feedScroll).waitFor();
  await loadWholeList(page, feedScroll, true);
  return { session, once: () => scrollDownAndUp(page, feedScroll) };
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
  await page.getByLabel('Close navigation').click();
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

const scenarios: Record<string, Scenario> = { sidebar, feed, sessions, drawer };

// Warms the code paths and caches with a first pass, then measures.
async function measureScenario(
  page: Page,
  interaction: string,
  cpu: number,
): Promise<Result> {
  const scenario = scenarios[interaction];
  if (!scenario) throw new Error(`No ${interaction} scenario`);
  const { session, once } = await scenario(page);
  await once();
  return run({ interaction, cpu, session, page, once });
}

for (const cpu of cpuRates)
  for (const interaction of Object.keys(scenarios).filter(wanted))
    test(`${interaction} at ${cpu}x CPU`, async ({ page }) => {
      const result = await measureScenario(page, interaction, cpu);
      results.push(result);
      expect(result.median.fps).toBeGreaterThan(0);
    });

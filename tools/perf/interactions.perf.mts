import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { feedScenarios } from './feed-scenarios.mts';
import { report } from './frame-report.mts';
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
  type Measurement,
  plannedCases,
  keepFrameResult,
  type Result,
  run,
} from './results.mts';
import { caseName } from './run-completeness.mts';
import { type SeededServer, startSeededServer } from './seed.mts';

const toggleSettleMilliseconds = 330;

const drawerSettleMilliseconds = 600;

const sidebarToggles = 6;

const drawerCycles = 3;

const openNavigation = 'Open navigation';

// The front drawer's scrim, labelled by `compose-drawer-options.ts` to pair with the Open navigation button.
const closeNavigation = 'Close navigation';

/*
 * The scrim spans the window, but the drawer sits over its leading edge, so a tap on the scrim's
 * middle is intercepted by the drawer. The drawer always leaves a strip of the page showing beside
 * it, so the tap that dismisses it goes just inside the scrim's trailing edge, whatever that strip
 * is worth: reading the drawer's own width here would couple this to how wide the drawer happens
 * to be.
 */
const scrimTapInset = 8;

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
  await report({
    planned,
    seeded: {
      sessions: server.sessionCount,
      feedRows: server.feedRowCount,
    },
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
    position: { x: phone.width - scrimTapInset, y: phone.height / 2 },
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

// The scenarios this run owes a measurement for, and the tests that owe them, from one list.
const planned = plannedCases([...scenarios.keys()]);

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

for (const planCase of planned)
  test(caseName(planCase), async ({ page }) => {
    const { interaction, cpu } = planCase;
    const result = await measureScenario(page, interaction, cpu);
    await keepFrameResult(result);
    expect(result.median.fps).toBeGreaterThan(0);
  });

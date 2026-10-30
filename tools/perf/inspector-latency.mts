import { expect, type Locator, type Page } from '@playwright/test';
import {
  changedMarker,
  changeOnly,
  diffFile,
  diffCounts,
  type DiffSize,
} from './diff-fixture.mts';
import { type ElapsedScenario, type TimedAction } from './elapsed-scenario.mts';
import { desktop, openApp, openSession } from './page.mts';
import type { SeededServer } from './seed.mts';

const changesList = '[data-testid="changes-files"]';

const workbenchOverview = (page: Page): Locator =>
  page
    .getByTestId('session-workbench')
    .getByRole('button', { name: 'Open Changes overview' });

// Reopens the Session with the Inspector closed and one file of `size` changed.
async function reopenChanged(
  page: Page,
  server: SeededServer,
  size: DiffSize,
): Promise<Locator> {
  await changeOnly(server.projectPath, size);
  await page.goto('/');
  await openSession(page, server.shortSessionTitle);
  await workbenchOverview(page).waitFor();

  // An Inspector that reopened by itself would be timed as already open, so say so instead.
  await expect(page.locator(changesList)).toHaveCount(0);

  return workbenchOverview(page);
}

async function prepareDiff(
  page: Page,
  server: SeededServer,
  size: DiffSize,
): Promise<TimedAction> {
  const overview = await reopenChanged(page, server, size);
  const text = changedMarker(size);

  return {
    event: 'pointerdown',
    readiness: { kind: 'text', selector: changesList, text },
    dispatch: () => overview.click(),
  };
}

/*
 * PF-21, diff arm: opens the Changes overview of a Session whose Project has exactly one changed
 * file, of the size the scenario names. The Session is reopened every trial, so each starts with
 * the Inspector closed and nothing of the diff loaded.
 */
export async function inspectorDiff(
  page: Page,
  server: SeededServer,
  size: DiffSize,
): Promise<ElapsedScenario> {
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });
  const { changedLines, bytes } = diffCounts(size);

  return {
    condition: 'document-reload',
    boundary: `Changes overview pointerdown → first changed line of ${diffFile(size)} (${changedLines} changed lines, ${bytes} bytes) drawn in the Changes list with unchanged geometry; the Session is reloaded and reopened before each trial; Back and tab switches are not timed`,
    prepare: () => prepareDiff(page, server, size),
  };
}

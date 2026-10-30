import { expect, type Locator, type Page } from '@playwright/test';
import {
  type ElapsedScenario,
  type TimedAction,
  warmScenario,
} from './elapsed-scenario.mts';
import { desktop, openApp, sessionsScroll } from './page.mts';
import { sessionTitle } from './seed-sessions.mts';
import type { SeededServer } from './seed.mts';

const searchLabel = 'Search Sessions';

// Matches the Session at index 2 and the ones whose number it prefixes; the Session at index 3 never matches.
const query = sessionTitle(2);

const excluded = sessionTitle(3);

/*
 * Closes a search the last trial left open, which empties its query, then opens it afresh with the
 * whole list drawn. Role queries skip what the field hides from the accessibility tree, so each
 * button is found only in the state where it works.
 */
async function openEmptySearch(page: Page): Promise<Locator> {
  const close = page.getByRole('button', { name: 'Close search', exact: true });

  if (await close.count()) await close.click();
  await expect(page.getByTestId(sessionsScroll)).toContainText(excluded);
  await page.getByRole('button', { name: searchLabel, exact: true }).click();

  return page.getByPlaceholder(searchLabel);
}

async function prepareSearch(page: Page): Promise<TimedAction> {
  const input = await openEmptySearch(page);

  return {
    event: 'input',
    readiness: { kind: 'search', included: query, excluded },
    dispatch: () => input.fill(query),
  };
}

/*
 * PF-23, search arm: filling the Sessions search box, until the list shows a matching title and
 * no longer shows a non-matching one. The seeded Sessions are the search index.
 */
export async function sessionSearch(
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> {
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });
  await page.getByTestId(sessionsScroll).waitFor();

  return warmScenario(
    `Sessions search input event with the whole query set at once → a matching title drawn and a non-matching one gone from the Sessions list, ${server.sessionCount} Sessions; includes any product debounce; keystroke dispatch is not part of it`,
    () => prepareSearch(page),
  );
}

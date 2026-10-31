import type { Page } from '@playwright/test';
import { composerUsable, feedShows } from './driver-wait.mts';
import { latestMessage } from './elapsed-scenario.mts';
import { turnTimeoutMilliseconds } from './feed-scenarios.mts';
import { soakPrompt } from './held-prompt.mts';
import {
  feedScroll,
  openSession,
  scrollDownAndUp,
  sessionsScroll,
} from './page.mts';
import type { Probe, Soak } from './soak-state.mts';

const stopName = 'Stop';

// How long a cancellation waits for the Stop button before the cycle records that it could not cancel.
const stopAppearsMs = 5000;

async function timedOpen(page: Page, soak: Soak): Promise<number> {
  const { longSessionTitle } = soak.server;
  const row = new RegExp(`^${longSessionTitle}, `, 'u');

  await page.goto('/');
  await page.getByRole('button', { name: row }).waitFor();

  const start = performance.now();

  await openSession(page, longSessionTitle);
  await feedShows(page, latestMessage);

  return performance.now() - start;
}

// The short latency probe, repeated at the same interval: a reloaded App opening the long Session.
export async function probe(page: Page, soak: Soak): Promise<void> {
  const entry: Probe = {
    elapsedMs: performance.now() - soak.startedAt,
    sessionOpenMs: null,
  };

  try {
    entry.sessionOpenMs = await timedOpen(page, soak);
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error);
  }

  soak.probes.push(entry);
}

const appeared = (page: Page): Promise<boolean> =>
  page
    .getByRole('button', { name: stopName, exact: true })
    .waitFor({ state: 'attached', timeout: stopAppearsMs })
    .then(
      () => true,
      () => false,
    );

async function cancelTurn(page: Page, soak: Soak): Promise<void> {
  soak.activity.cancellationsAttempted += 1;

  if (!(await appeared(page))) return;
  await page.getByRole('button', { name: stopName, exact: true }).click();
  soak.activity.cancellationsObserved += 1;
}

async function turn(page: Page, soak: Soak, cancel: boolean): Promise<void> {
  await composerUsable(page);
  await page.getByRole('textbox', { name: 'Message' }).fill(soakPrompt(cancel));
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  soak.activity.turns += 1;

  if (cancel) await cancelTurn(page, soak);
  await page
    .getByRole('button', { name: stopName, exact: true })
    .waitFor({ state: 'detached', timeout: turnTimeoutMilliseconds });
}

async function browse(page: Page, soak: Soak): Promise<void> {
  await page.getByTestId(sessionsScroll).waitFor();
  await scrollDownAndUp(page, sessionsScroll);
  await openSession(page, soak.server.longSessionTitle);
  await page.getByTestId(feedScroll).waitFor();
  await scrollDownAndUp(page, feedScroll);
}

// One pass over what a long session of use repeats: the list, a long Feed, another Session, a Turn.
export async function cycle(page: Page, soak: Soak): Promise<void> {
  await browse(page, soak);
  await page.goto('/');
  await openSession(page, soak.server.shortSessionTitle);
  await turn(page, soak, soak.activity.cycles % 2 === 1);
  await page.goto('/');
  soak.activity.cycles += 1;
}

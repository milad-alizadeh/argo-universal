import { errors, type Locator, type Page } from '@playwright/test';
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
import type { Activity, Probe, Soak } from './soak-state.mts';

const stopName = 'Stop';

// How long one press waits for Stop to appear and take the click before the cycle records that the Turn finished first.
const stopPressWindowMs = 5000;

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

const stopButton = (page: Page): Locator =>
  page.getByRole('button', { name: stopName, exact: true });

export type StopButton = Pick<Locator, 'click' | 'count'>;

/*
 * A timeout with Stop gone means the Turn finished first, which is normal.
 * Stop still drawn, or any other error, is a real failure.
 */
async function finishedFirst(stop: StopButton, error: Error): Promise<false> {
  if (!(error instanceof errors.TimeoutError)) throw error;

  if ((await stop.count()) > 0) throw error;

  return false;
}

// One press that waits for Stop and clicks it, so a Turn finishing between a check and the click cannot fail the soak.
const pressStop = (stop: StopButton): Promise<boolean> =>
  stop.click({ timeout: stopPressWindowMs }).then(
    () => true,
    (error: Error) => finishedFirst(stop, error),
  );

export async function cancelTurn(
  stop: StopButton,
  activity: Activity,
): Promise<void> {
  activity.cancellationsAttempted += 1;

  if (await pressStop(stop)) activity.cancellationsObserved += 1;
}

async function turn(page: Page, soak: Soak, cancel: boolean): Promise<void> {
  await composerUsable(page);
  await page.getByRole('textbox', { name: 'Message' }).fill(soakPrompt(cancel));
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  soak.activity.turns += 1;

  if (cancel) await cancelTurn(stopButton(page), soak.activity);
  await stopButton(page).waitFor({
    state: 'detached',
    timeout: turnTimeoutMilliseconds,
  });
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

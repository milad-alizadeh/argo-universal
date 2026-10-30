import type { Page } from '@playwright/test';
import type { ElapsedResult, ObservedTrial } from './elapsed-results.mts';
import {
  type DriverAction,
  type ElapsedScenario,
  isObserved,
  readinessTimeout,
  repetitions,
  type TimedAction,
  warmups,
} from './elapsed-scenario.mts';
import { measureElapsed } from './elapsed.mts';
import {
  cancelUiObservation,
  observeUi,
  readUiObservation,
  type UiObservation,
} from './ui-observation.mts';

interface TrialState {
  action?: TimedAction | DriverAction;
  browser?: UiObservation;
}

async function prepareTrial(
  page: Page,
  scenario: ElapsedScenario,
  state: TrialState,
): Promise<void> {
  const action = await scenario.prepare();
  state.action = action;

  if (isObserved(action)) await observeUi(page, action.event, action.readiness);
}

async function dispatchTrial(state: TrialState): Promise<void> {
  if (!state.action) throw new Error('The action was not prepared');
  await state.action.dispatch();
}

async function awaitReady(page: Page, state: TrialState): Promise<void> {
  if (!state.action) throw new Error('The action was not prepared');

  if (isObserved(state.action))
    state.browser = await readUiObservation(page, readinessTimeout);
  else await state.action.ready();
}

async function trial(
  page: Page,
  scenario: ElapsedScenario,
): Promise<ObservedTrial> {
  const state: TrialState = {};

  const driver = await measureElapsed({
    prepare: () => prepareTrial(page, scenario, state),
    action: () => dispatchTrial(state),
    ready: () => awaitReady(page, state),
  });

  await cancelUiObservation(page);

  return { driver, ...(state.browser && { browser: state.browser }) };
}

async function collect(
  page: Page,
  scenario: ElapsedScenario,
  result: ElapsedResult,
): Promise<void> {
  for (let index = 0; index < warmups; index += 1)
    result.warmups.push(await trial(page, scenario));

  for (let index = 0; index < repetitions; index += 1)
    result.samples.push(await trial(page, scenario));
}

export async function runElapsed(
  page: Page,
  scenario: ElapsedScenario,
  result: ElapsedResult,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: result.cpu });

  try {
    await collect(page, scenario, result);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await cdp.detach();
  }
}

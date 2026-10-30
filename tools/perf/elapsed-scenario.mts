import { expect, type Page } from '@playwright/test';
import { z } from 'zod';
import type { ElapsedResult } from './elapsed-results.mts';
import { feedScroll } from './page.mts';
import type { UiEvent, UiReadiness } from './ui-observation.mts';

const count = z.coerce.number().int().positive();

export const repetitions = count.parse(process.env.PERF_RUNS ?? 30);

export const warmups = count.parse(process.env.PERF_WARMUPS ?? 3);

export const readinessTimeout = count.parse(
  process.env.PERF_READY_TIMEOUT ?? 10_000,
);

// A distinctive phrase in the last recorded Agent message, independent of the UI's rendering calculation.
export const latestMessage = 'The single patch attempt failed:';

export interface TimedAction {
  event: UiEvent;
  readiness: UiReadiness;
  dispatch: () => Promise<void>;
}

/*
 * An action the browser cannot observe, because the page is replaced or the Server is restarted
 * under it. It is timed on the driver's clock alone: `dispatch` starts it, `ready` ends it.
 */
export interface DriverAction {
  dispatch: () => Promise<void>;
  ready: () => Promise<void>;
}

export const isObserved = (
  action: TimedAction | DriverAction,
): action is TimedAction => 'readiness' in action;

export interface ElapsedScenario {
  condition: ElapsedResult['condition'];
  boundary: string;
  prepare: () => Promise<TimedAction | DriverAction>;
  // The result is timed on the driver's clock alone; there is no browser observation to report.
  driverOnly?: true;
  // Why this scenario cannot be measured at a browser CPU slowdown other than 1, when it cannot.
  unthrottled?: string;
}

export type ScenarioFactory = (page: Page) => Promise<ElapsedScenario>;

export const hasLatestMessage = (page: Page): Promise<void> =>
  expect(page.getByTestId(feedScroll)).toContainText(latestMessage);

// Preparation gives initial list measurements three rendering opportunities, outside the timed action.
export async function scrollMetrics(
  page: Page,
  testId: string,
): Promise<{ top: number; height: number }> {
  return page.getByTestId(testId).evaluate(async (element) => {
    for (let frame = 0; frame < 3; frame += 1)
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );

    return { top: element.scrollTop, height: element.scrollHeight };
  });
}

export function warmScenario(
  boundary: string,
  prepare: ElapsedScenario['prepare'],
): ElapsedScenario {
  return { condition: 'warm', boundary, prepare };
}

const unthrottled = (
  { unthrottled: reason }: ElapsedScenario,
  cpu: number,
): Pick<ElapsedResult, 'notApplicable'> =>
  cpu !== 1 && reason !== undefined ? { notApplicable: reason } : {};

const driverClock = ({
  driverOnly,
}: ElapsedScenario): Pick<ElapsedResult, 'driverOnly'> =>
  driverOnly ? { driverOnly } : {};

// What a result records about its scenario: a driver-only clock, and a slowdown the scenario cannot take.
export const scenarioNotes = (
  scenario: ElapsedScenario,
  cpu: number,
): Pick<ElapsedResult, 'driverOnly' | 'notApplicable'> => ({
  ...driverClock(scenario),
  ...unthrottled(scenario, cpu),
});

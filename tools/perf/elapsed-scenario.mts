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

export interface ElapsedScenario {
  condition: ElapsedResult['condition'];
  boundary: string;
  prepare: () => Promise<TimedAction>;
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

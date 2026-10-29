import type { Page } from '@playwright/test';
import { probeScript, type UiEvent, type UiObservation } from './ui-probe.mts';
import { readinessScript, type UiReadiness } from './ui-readiness.mts';

export type { UiEvent, UiObservation } from './ui-probe.mts';

export type { UiReadiness } from './ui-readiness.mts';

// Browser event to observable DOM readiness on the browser's own monotonic clock.
export async function observeUi(
  page: Page,
  event: UiEvent,
  readiness: UiReadiness,
): Promise<void> {
  await page.addScriptTag({ content: `${readinessScript}\n${probeScript}` });
  await page.evaluate(
    ({ event, readiness }) => window.installUiProbe(event, readiness),
    { event, readiness },
  );
}

export async function readUiObservation(
  page: Page,
  timeout: number,
): Promise<UiObservation> {
  await page.waitForFunction(() => window.argoPerfProbe?.result, undefined, {
    timeout,
  });
  const result = await page.evaluate(() => window.argoPerfProbe?.result);

  if (!result) throw new Error('The UI observation was not recorded');

  return result;
}

export async function cancelUiObservation(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.cancelUiProbe?.();
    delete window.argoPerfProbe;
  });
}

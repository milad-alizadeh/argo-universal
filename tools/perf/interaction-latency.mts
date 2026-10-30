import { expect, type Locator, type Page } from '@playwright/test';
import {
  type ElapsedScenario,
  hasLatestMessage,
  scrollMetrics,
  type TimedAction,
  warmScenario,
} from './elapsed-scenario.mts';
import { desktop, feedScroll, loadWholeList, openApp } from './page.mts';
import type { SeededServer } from './seed.mts';

const expandedAttribute = 'aria-expanded';

const typedText = 'PERF_TYPING_1320_0123456789';

async function closeDisclosure(
  trigger: Locator,
  contentId: string,
): Promise<void> {
  if ((await trigger.getAttribute(expandedAttribute)) === 'true')
    await trigger.click();
  await expect(trigger).toHaveAttribute(expandedAttribute, 'false');
  await trigger
    .page()
    .waitForFunction((id) => document.getElementById(id) === null, contentId);
}

async function openedContentId(trigger: Locator): Promise<string> {
  await trigger.click();
  await expect(trigger).toHaveAttribute(expandedAttribute, 'true');
  const contentId = await trigger.getAttribute('aria-controls');

  if (!contentId) throw new Error('Recorded Feed needs a Tool disclosure');

  return contentId;
}

async function prepareExpansion(
  trigger: Locator,
  contentId: string,
): Promise<TimedAction> {
  await closeDisclosure(trigger, contentId);
  await trigger.scrollIntoViewIfNeeded();

  return {
    event: 'pointerdown',
    readiness: { kind: 'expanded', contentId },
    dispatch: () => trigger.click(),
  };
}

async function openRecorded(page: Page, server: SeededServer): Promise<void> {
  await openApp(page, {
    serverUrl: server.serverUrl,
    viewport: desktop,
    session: server.longSessionTitle,
  });
  await hasLatestMessage(page);
}

export async function expansion(
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> {
  await openRecorded(page, server);

  const trigger = page
    .getByTestId(feedScroll)
    .locator('[aria-expanded]:not([aria-haspopup])')
    .first();

  const contentId = await openedContentId(trigger);

  return warmScenario(
    'Tool disclosure pointerdown → controlled content visible with stable geometry; frame expansion workload remains separate',
    () => prepareExpansion(trigger, contentId),
  );
}

async function prepareWheel(page: Page, testId: string): Promise<TimedAction> {
  const list = page.getByTestId(testId);
  await list.evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
  });
  const { top } = await scrollMetrics(page, testId);
  await list.hover();

  return {
    event: 'wheel',
    readiness: { kind: 'scroll', testId, from: top },
    dispatch: () => page.mouse.wheel(0, 500),
  };
}

export async function openWheel(
  page: Page,
  server: SeededServer,
  testId: string,
): Promise<void> {
  await openApp(page, {
    serverUrl: server.serverUrl,
    viewport: desktop,
    ...(testId === feedScroll && { session: server.longSessionTitle }),
  });
  await page.getByTestId(testId).waitFor();
  await loadWholeList(page, testId, testId === feedScroll);
}

export async function wheel(
  page: Page,
  server: SeededServer,
  testId: string,
): Promise<ElapsedScenario> {
  await openWheel(page, server, testId);

  return warmScenario(
    'Actual wheel event → changed scroll position and nonempty rendered content; all pages loaded before timing; not physical touch or inertia',
    () => prepareWheel(page, testId),
  );
}

async function prepareTyping(input: Locator): Promise<TimedAction> {
  await input.fill('');
  await input.focus();

  return {
    event: 'keydown',
    readiness: { kind: 'input', text: typedText },
    dispatch: () => input.pressSequentially(typedText),
  };
}

export async function typing(
  page: Page,
  server: SeededServer,
): Promise<ElapsedScenario> {
  await openRecorded(page, server);
  const input = page.getByRole('textbox', { name: 'Message' });

  return warmScenario(
    'First keydown event → complete exact Composer text, including sequential keyboard dispatch; no prompt sent to an upstream Agent',
    () => prepareTyping(input),
  );
}

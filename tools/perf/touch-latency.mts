import type { CDPSession, Page } from '@playwright/test';
import {
  type ElapsedScenario,
  scrollMetrics,
  type TimedAction,
  warmScenario,
} from './elapsed-scenario.mts';
import { openWheel } from './interaction-latency.mts';
import type { SeededServer } from './seed.mts';

// Pixels the finger travels, upward, so the content moves down.
const swipeDistance = 500;

const swipeSpeed = 1200;

interface Centre {
  x: number;
  y: number;
}

async function centreOf(page: Page, testId: string): Promise<Centre> {
  const box = await page.getByTestId(testId).boundingBox();

  if (!box) throw new Error(`${testId} has no box to swipe`);

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function swipe(cdp: CDPSession, centre: Centre): Promise<void> {
  await cdp.send('Input.synthesizeScrollGesture', {
    ...centre,
    yDistance: -swipeDistance,
    speed: swipeSpeed,
    gestureSourceType: 'touch',
  });
}

// Puts the list at its middle, so a swipe either way has room to move it.
async function atMiddle(page: Page, testId: string): Promise<number> {
  await page.getByTestId(testId).evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
  });

  return (await scrollMetrics(page, testId)).top;
}

async function prepareTouch(
  page: Page,
  cdp: CDPSession,
  testId: string,
): Promise<TimedAction> {
  const from = await atMiddle(page, testId);
  const centre = await centreOf(page, testId);

  return {
    event: 'pointerdown',
    readiness: { kind: 'scroll', testId, from },
    dispatch: () => swipe(cdp, centre),
  };
}

/*
 * PF-20, touch arm: a touch swipe from the browser's own input pipeline, not a scrollTop write. It
 * moves the list `testId` after every page is loaded. A desktop-width viewport takes the swipe, so
 * this is not a phone's touch handling, and the gesture's inertia is not read.
 */
export async function touch(
  page: Page,
  server: SeededServer,
  testId: string,
): Promise<ElapsedScenario> {
  await openWheel(page, server, testId);
  const cdp = await page.context().newCDPSession(page);

  return warmScenario(
    'Touch swipe pointerdown (Input.synthesizeScrollGesture, touch source) → changed scroll position and nonempty rendered content; all pages loaded before timing; desktop-width viewport; not a phone, no inertia read',
    () => prepareTouch(page, cdp, testId),
  );
}

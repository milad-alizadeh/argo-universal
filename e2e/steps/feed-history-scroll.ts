import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { agentWork } from './timeouts';

export const oldestHistoryMessage = 'History message 1.';

export async function scrollToOldestHistoryMessage(page: Page): Promise<void> {
  const feed = page.getByTestId('feed-scroll');
  const oldest = feed.getByText(oldestHistoryMessage, { exact: true });
  // An older page lands at the top, then the Feed keeps its place and moves it up out of view, so scroll again until the oldest message stays.
  await expect(async () => {
    await feed.evaluate((element) => {
      element.scrollTop = 0;
    });
    await oldest.scrollIntoViewIfNeeded({ timeout: 100 });
    await expect(oldest).toBeInViewport({ timeout: 100 });
    await expectStaysInView(page, oldest);
  }).toPass(agentWork);
}

// No older page is loading, and the row is still in view once a pending scroll adjustment lands.
async function expectStaysInView(page: Page, row: Locator): Promise<void> {
  await expect(
    page.getByRole('progressbar', { name: 'Loading earlier' }),
  ).toHaveCount(0);
  await afterFrames(page, 10);
  await expect(row).toBeInViewport({ timeout: 100 });
}

// The browser's frame callback, used inside page.evaluate; the e2e project has no DOM lib.
declare const requestAnimationFrame: (callback: () => void) => number;

// Waits for the page to draw this many frames, so a pending scroll adjustment lands.
async function afterFrames(page: Page, frames: number): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let left = count;
        const tick = (): void => {
          left -= 1;
          if (left > 0) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

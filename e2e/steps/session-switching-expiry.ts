import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { oldestHistoryMessage, shownFeed } from './feed-history-scroll';
import { Given, When, Then } from './fixtures';
import { startSession } from './live-session';
import { returnToLongFeed, topInFeed } from './reading-place';

const oldestMessage = (page: Page): Locator =>
  shownFeed(page).getByText(oldestHistoryMessage, { exact: true });

const oldestFeedPosition = new WeakMap<Page, number>();

Given('the browser clock can advance for Feed expiration', async ({ page }) => {
  await page.clock.install();
});

When("I remember the oldest Feed message's position", async ({ page }) => {
  const row = oldestMessage(page);
  await expect(row).toBeInViewport();
  oldestFeedPosition.set(page, await topInFeed(page, row));
});

When('I create three other Sessions', async ({ page }) => {
  for (const title of ['First other', 'Second other', 'Third other'])
    await startSession(page, title);
});

When('the Feed cache expires', async ({ page }) => {
  await page.clock.fastForward(600_001);
});

Then(
  'the oldest Feed message returns to its remembered position',
  async ({ page }) => {
    const before = oldestFeedPosition.get(page);

    if (before === undefined)
      throw new Error('No reading place was remembered');
    const row = oldestMessage(page);

    await expect(async () => {
      await expect(row).toBeInViewport();
      expect(Math.abs((await topInFeed(page, row)) - before)).toBeLessThan(30);
    }).toPass({ timeout: 20_000 });
  },
);

When('I return to the long Feed', async ({ page }) => {
  await returnToLongFeed(page);
});

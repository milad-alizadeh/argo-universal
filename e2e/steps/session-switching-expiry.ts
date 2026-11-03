import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { openSessionRow, sessionRow, startSession } from './live-session';

const feed = (page: Page): Locator =>
  page.getByTestId('feed-scroll').filter({ visible: true });

const oldestFeedPosition = new WeakMap<Page, number>();

Given('the browser clock can advance for Feed expiration', async ({ page }) => {
  await page.clock.install();
});

When("I remember the oldest Feed message's position", async ({ page }) => {
  const row = feed(page).getByText('History message 1.', { exact: true });
  await expect(row).toBeInViewport();
  const box = await row.boundingBox();
  const feedBox = await feed(page).boundingBox();

  if (!box || !feedBox) throw new Error('The reading position is missing');
  oldestFeedPosition.set(page, box.y - feedBox.y);
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
      throw new Error('No reading position was remembered');
    const row = feed(page).getByText('History message 1.', { exact: true });

    await expect(async () => {
      await expect(row).toBeInViewport();
      const box = await row.boundingBox();
      const feedBox = await feed(page).boundingBox();

      if (!box || !feedBox) throw new Error('The reading position is missing');
      expect(Math.abs(box.y - feedBox.y - before)).toBeLessThan(30);
    }).toPass({ timeout: 20_000 });
  },
);

When('I return to the long Feed', async ({ page }) => {
  await openSessionRow(
    page,
    sessionRow(page, 'Build a long history'),
    'Build a long history',
  );
});

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, Then, When } from './fixtures';
import { reloadApp } from './frame';

const reportFeed = (page: Page): Locator =>
  page.getByRole('tabpanel', { name: 'Agent Feed' }).getByTestId('feed-scroll');

async function scrollReports(page: Page, end: boolean): Promise<void> {
  await reportFeed(page).evaluate((element, last) => {
    element.scrollTop = last ? element.scrollHeight : 0;
  }, end);
}

Given('Agent {int} supplies Agent reports', expectListedAgent);

When('I reopen the report Session', async ({ page }) => {
  const url = page.url();

  await reloadApp(page);
  await page.getByRole('button', { name: /^Review many findings,/ }).click();
  await expect(page).toHaveURL(url);
});

When('I open the report reviewer', async ({ page }) => {
  await page
    .getByTestId('workbench-subagents')
    .getByRole('button', { name: /Show/ })
    .click();
  await page.getByRole('button', { name: /^Report reviewer,/ }).click();
});

Then('the reviewer shows recent reports', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Load earlier reports' }),
  ).toBeVisible();
  await expect(
    page.getByText('Other Agent finding', { exact: true }),
  ).toHaveCount(0);
});

When('I load all earlier reports', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Load earlier reports' });

  for (let index = 0; index < 4; index += 1) {
    await expect(button).toBeEnabled();
    await button.click();
  }

  await expect(button).toHaveCount(0);
});

Then('the reviewer shows its oldest report', async ({ page }) => {
  await scrollReports(page, false);

  await expect(page.getByText('Finding 0', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Review complete.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Source' })).toBeVisible();
});

Then('the open reviewer shows the revised finding', async ({ page }) => {
  await scrollReports(page, true);

  await expect(
    page.getByText('Finding updated', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Finding 180', { exact: true })).toHaveCount(0);
  await scrollReports(page, false);
  await expect(
    page.getByText('Old finding revised', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('and expanded', { exact: true })).toBeVisible();
  await expect(page.getByText('Finding 0', { exact: true })).toHaveCount(0);
});

When('I switch to the other reviewer', async ({ page }) => {
  const feed = page.getByTestId('feed-scroll').first();

  await feed.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.getByRole('button', { name: /^Other reviewer replied/ }).click();
});

Then('the other reviewer shows only its own finding', async ({ page }) => {
  await expect(
    page.getByText('Other Agent finding', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Finding 0', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Finding updated', { exact: true })).toHaveCount(
    0,
  );
});

When('I return to the Agents list', async ({ page }) => {
  await page.getByRole('button', { name: 'Back to Agents' }).click();
});

Then('the Agents list shows both reviewers', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: /^Report reviewer,/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Other reviewer,/ }),
  ).toBeVisible();
});

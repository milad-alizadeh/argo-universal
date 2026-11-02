import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, Then, When } from './fixtures';
import { reloadApp } from './frame';

Given('Agent {int} supplies Agent reports', expectListedAgent);

When('I reopen the report Session', async ({ page }) => {
  const url = page.url();

  await reloadApp(page);
  await page.getByRole('button', { name: /^Review many findings,/ }).click();
  await expect(page).toHaveURL(url);
});

When('I open the report reviewer', async ({ page }) => {
  await page
    .getByRole('button', { name: /^Report reviewer replied/ })
    .last()
    .click();
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
  await expect(page.getByText('Finding 0', { exact: true })).toBeVisible();
});

Then('the open reviewer shows the revised finding', async ({ page }) => {
  const feed = page
    .getByRole('tabpanel', { name: 'Agent Feed' })
    .getByTestId('feed-scroll');

  await feed.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.getByText('Finding updated', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Finding 180', { exact: true })).toHaveCount(0);
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
});

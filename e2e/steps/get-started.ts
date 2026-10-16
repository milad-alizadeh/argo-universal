import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { reloadApp } from './frame';

Given('the fixture Server has no Projects', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Agent Setup' }),
  ).toBeVisible();
});

When('I install featured Agent {string}', async ({ page }, name: string) => {
  await page
    .getByRole('button', { name: `Install ${name}`, exact: true })
    .click();
});

Then('Agent Setup is done', async ({ page }) => {
  await expect(page.getByLabel('Done', { exact: true })).toHaveCount(1);
});

When('the fixture Project is registered', async ({ app, page }) => {
  await app.restartEngine(() => Promise.resolve());
  await reloadApp(page);
});

Then('the Agent picker remembers {string}', async ({ page }, name: string) => {
  await expect(
    page.getByRole('button', { name: 'Select Agent', exact: true }),
  ).toContainText(name);
  await page.getByRole('button', { name: 'Select Agent', exact: true }).click();
  await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

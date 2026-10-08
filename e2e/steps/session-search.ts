import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { liveSessionRow } from './live-session';

const searchLabel = 'Search Sessions';

When(
  'I search Sessions for {string}',
  async ({ page }, search: string): Promise<void> => {
    await page.getByRole('button', { name: searchLabel, exact: true }).click();
    await page.getByPlaceholder(searchLabel).fill(search);
  },
);

When('I finish searching Sessions', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Close search', exact: true }).click();
});

Then(
  'the Sessions list has no matching Sessions',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByText('No matching Sessions', { exact: true }),
    ).toBeVisible();
    await expect(liveSessionRow(page)).toHaveCount(0);
  },
);

Given('the Sessions search has no matches', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: searchLabel, exact: true }).click();
  await page.getByPlaceholder(searchLabel).fill('No Session has this title');
  await expect(
    page.getByText('No matching Sessions', { exact: true }),
  ).toBeVisible();
});

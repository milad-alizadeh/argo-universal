import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { liveSessionRow } from './live-session';

When(
  'I filter Sessions to {string}',
  async ({ page }, filter: string): Promise<void> => {
    await page.getByRole('button', { name: 'Filter Sessions' }).click();
    await page
      .getByRole('menuitemradio', { name: filter, exact: true })
      .click();
  },
);

Then(
  'the Sessions list has no archived Sessions',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByText('No archived Sessions', { exact: true }),
    ).toBeVisible();
    await expect(liveSessionRow(page)).toHaveCount(0);
  },
);

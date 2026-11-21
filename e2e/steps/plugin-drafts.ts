import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone } from './frame';

Then('the Draft bar is shown', async ({ page }): Promise<void> => {
  await expect(page.getByRole('toolbar', { name: 'Draft' })).toBeVisible();
});

Then('no Draft bar is shown', async ({ page }): Promise<void> => {
  await expect(page.getByRole('toolbar', { name: 'Draft' })).toHaveCount(0);
});

// A wide Frame lists the states as tabs; a phone folds them into the State menu.
When(
  'I choose the {string} Draft state',
  async ({ page }, state: string): Promise<void> => {
    const bar = page.getByRole('toolbar', { name: 'Draft' });

    if (!onPhone(page)) {
      await bar.getByRole('button', { name: state, exact: true }).click();

      return;
    }

    await bar.getByRole('button', { name: 'State' }).click();
    await page.getByRole('menuitemradio', { name: state, exact: true }).click();
  },
);

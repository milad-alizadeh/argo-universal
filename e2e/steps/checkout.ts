import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { openNewSession } from './new-session';

Given('a New Session', async ({ page }): Promise<void> => {
  await openNewSession(page);
});

When('I choose the local Checkout', async ({ page }): Promise<void> => {
  const checkout = page.getByRole('button', { name: 'Checkout' });
  await expect(checkout).toHaveText(/New worktree from\s*main/);
  await checkout.click();
  await page.getByRole('button', { name: 'Local' }).click();
  await expect(checkout).toHaveText(/Local/);
});

Then(
  'the next New Session remembers the local Checkout',
  async ({ page }): Promise<void> => {
    await page.goBack();
    await openNewSession(page);
    await expect(page.getByRole('button', { name: 'Checkout' })).toHaveText(
      /Local/,
    );
  },
);

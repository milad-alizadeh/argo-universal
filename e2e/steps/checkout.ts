import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { chooseLocalCheckout, openNewSession } from './new-session';

Given('a New Session', async ({ page }): Promise<void> => {
  await openNewSession(page);
});

When('I choose the local Checkout', async ({ page }): Promise<void> => {
  await chooseLocalCheckout(page);
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

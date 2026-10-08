import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { phone } from './frame';
import { expectSettingsList } from './navigation';

Given(
  'the Connection was opened on its own in a phone Frame',
  async ({ page }): Promise<void> => {
    await page.setViewportSize(phone);
    await page.addInitScript(
      "if (location.pathname === '/') history.replaceState(null, '', '/settings/connection')",
    );
    await page.reload();
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

When('I return from the Connection', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: /back/i }).click();
});

Then(
  'the phone Frame shows the Settings list',
  async ({ page }): Promise<void> => {
    await expectSettingsList(page);
    await expect(page.getByTestId('phone-shell')).toBeVisible();
  },
);

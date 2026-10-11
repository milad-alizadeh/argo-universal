import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { phone, wide } from './frame';

export async function expectSettingsList(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();
}

When('the Frame becomes a phone Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(phone);
});

When('the Frame becomes a wide Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(wide);
});

Then(
  'the Connection remains open in the phone Frame',
  async ({ page }): Promise<void> => {
    await expect(page.getByTestId('desktop-shell')).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings\/connection$/);
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

Then(
  'the Connection remains open in the wide Frame',
  async ({ page }): Promise<void> => {
    await expect(page.getByTestId('desktop-shell')).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/connection$/);
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

Then(
  'the phone Frame shows the Settings list without Accounts detail',
  async ({ page }): Promise<void> => {
    await expectSettingsList(page);
    await expect(page.getByTestId('phone-shell')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Accounts(?:,|$)/ }),
    ).toBeVisible();
    await expect(page.getByText('Accounts will appear here.')).toHaveCount(0);
  },
);

Then(
  'the wide Frame shows Accounts beside the Settings list',
  async ({ page }): Promise<void> => {
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByText('Accounts will appear here.')).toBeVisible();
  },
);

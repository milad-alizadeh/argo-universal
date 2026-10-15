import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import {
  compactFrame,
  onPhone,
  openConnection,
  phone,
  wide,
  wideFrame,
} from './frame';

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
    await expect(page.getByTestId(wideFrame)).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings\/connection$/);
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

Then(
  'the Connection remains open in the wide Frame',
  async ({ page }): Promise<void> => {
    await expect(page.getByTestId(wideFrame)).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/connection$/);
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

Then(
  'the phone Frame shows the Settings list without Accounts detail',
  async ({ page }): Promise<void> => {
    await expectSettingsList(page);
    await expect(page.getByTestId(compactFrame)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Accounts(?:,|$)/ }),
    ).toBeVisible();
    await expect(page.getByText('Accounts will appear here.')).toHaveCount(0);
  },
);

Then(
  'the wide Frame shows Accounts beside the Settings list',
  async ({ page }): Promise<void> => {
    // A wide Frame opens the list's first page, and the URL names it.
    await expect(page).toHaveURL(/\/settings\/accounts$/);
    await expect(
      page.getByRole('link', { name: /^Accounts(?:,|$)/ }),
    ).toBeVisible();
    await expect(page.getByText('Accounts will appear here.')).toBeVisible();
  },
);

When(
  'I view the Connection from the drawer',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'Show navigation menu' }).click();
    await openConnection(page);
  },
);

// A phone Frame picks a section from the Drawer behind ☰; a wide one from its rail.
When('I return to Sessions', async ({ page }): Promise<void> => {
  if (onPhone(page))
    await page.getByRole('button', { name: 'Show navigation menu' }).click();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
});

Then(
  'the phone Frame shows the Sessions list',
  async ({ page }): Promise<void> => {
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.getByTestId(compactFrame)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 1 }),
    ).toBeVisible();
  },
);

Then(
  'the wide Frame opens the first Sessions page',
  async ({ page }): Promise<void> => {
    // With no Session yet, the first page is New Session; the URL names it.
    await expect(page).toHaveURL(/\/sessions\/new$/);
    await expect(page.getByTestId(wideFrame)).toBeVisible();
  },
);

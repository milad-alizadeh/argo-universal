import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given } from './fixtures';

export const phone = { width: 390, height: 844 };
export const wide = { width: 1280, height: 800 };

export async function openConnection(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Connection', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/connection$/);
}

Given('a wide Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(wide);
});

Given('a phone Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(phone);
});

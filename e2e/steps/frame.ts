import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given } from './fixtures';

export const phone = { width: 390, height: 844 };

export const wide = { width: 1280, height: 800 };

// A phone Frame stacks each page over its list; a wide one keeps the list beside it.
export const onPhone = (page: Page): boolean =>
  (page.viewportSize()?.width ?? 0) <= phone.width;

// The web export serves only its root, so a reload starts there and opens the page again.
export async function reloadApp(page: Page): Promise<void> {
  await page.goto(new URL('/', page.url()).href);
}

export async function openConnection(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /^Connection(?:,|$)/ }).click();
  await expect(page).toHaveURL(/\/settings\/connection$/);
}

// The App opens in this Frame; a Frame that changes later keeps the page it shows.
async function openApp(
  page: Page,
  size: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(size);
  await reloadApp(page);
}

Given('a wide Frame', async ({ page }): Promise<void> => {
  await openApp(page, wide);
});

Given('a phone Frame', async ({ page }): Promise<void> => {
  await openApp(page, phone);
});

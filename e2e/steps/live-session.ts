import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { phone, wide } from './frame';

export const liveTitle = 'Check the live list';
export const attentionLabel = '1 Session needs attention';

export function liveSessionRow(page: Page): Locator {
  return page.getByRole('button', { name: new RegExp(`^${liveTitle}, `) });
}

export async function startSession(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(
    page.getByText('Start the Session in', { exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Message' }).fill(title);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
}

When(
  'I start a Session named {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('desktop-shell')).toBeVisible();
    await startSession(page, title);
  },
);

Given(
  'a Session named {string}',
  async ({ page }, title: string): Promise<void> => {
    await page.setViewportSize(wide);
    await startSession(page, title);
    await expect(
      page.getByRole('button', { name: `${title}, Unread`, exact: true }),
    ).toBeVisible();
  },
);

Given('an unread Session in a phone Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(wide);
  await startSession(page, liveTitle);
  await expect(
    page.getByRole('button', { name: `${liveTitle}, Unread`, exact: true }),
  ).toBeVisible();
  await page.setViewportSize(phone);
  await page.getByRole('link', { name: /back/i }).click();
});

Then(
  'the Sessions list shows the unread Session with one attention badge',
  async ({ page }): Promise<void> => {
    await expect(liveSessionRow(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: `${liveTitle}, Unread`, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(attentionLabel, { exact: true })).toHaveText(
      '1',
    );
  },
);

Then(
  'the live Session remains in the list',
  async ({ page }): Promise<void> => {
    await expect(liveSessionRow(page)).toBeVisible();
  },
);

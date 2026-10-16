import type { Locator, Page } from '@playwright/test';
import { expect, serverVersion } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone, openConnection, reloadApp } from './frame';
import { toast } from './toasts';

// A Server row is named "<label>, <value>".
function row(page: Page, label: string): Locator {
  return page.getByRole('group', { name: new RegExp(`^${label}, `) });
}

async function viewConnection(page: Page): Promise<void> {
  if (onPhone(page))
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await openConnection(page);
}

When('I view the Connection', async ({ page }): Promise<void> => {
  await viewConnection(page);
});

Then(
  'the Connection explains why details cannot load while the Server is unavailable',
  async ({ app, page }): Promise<void> => {
    await app.restartEngine(async () => {
      // A fresh App has no cached details: its real query must cross the unavailable Server boundary.
      await reloadApp(page);
      await viewConnection(page);
      await expect(
        toast(page, "Could not load the Server's details"),
      ).toBeVisible({ timeout: 20_000 });
      await expect(toast(page, "Couldn't reach the Server.")).toBeVisible();
      await expect(
        page.getByRole('group', { name: 'Connecting to the Server…' }),
      ).toBeVisible();
      await expect(row(page, 'Version')).toHaveCount(0);
    });
  },
);

Then(
  'the Connection shows the Server version',
  async ({ page }): Promise<void> => {
    await expect(row(page, 'Version')).toHaveAccessibleName(
      `Version, ${serverVersion}`,
    );
  },
);

Then(
  'the Connection follows the Server clock',
  async ({ page }): Promise<void> => {
    const clock = row(page, 'Clock');
    await expect(clock).toHaveAccessibleName(/^Clock, \d{2}:\d{2}:\d{2}$/);
    const first = await clock.getAttribute('aria-label');
    await expect(clock).not.toHaveAccessibleName(first ?? '');
    const second = await clock.getAttribute('aria-label');
    await expect(clock).not.toHaveAccessibleName(second ?? '');
  },
);

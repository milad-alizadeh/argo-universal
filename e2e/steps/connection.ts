import type { Locator, Page } from '@playwright/test';
import { expect, serverVersion } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone, openConnection, reloadApp } from './frame';
import { shownToasts } from './toasts';

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

// The banner while the Connection reconnects or is offline; each page in a stack has one, the shown page's is visible.
const banner = (page: Page): Locator =>
  page
    .getByText(/^(Reconnecting…|Can't reach .+)$/)
    .filter({ visible: true })
    .first();

// While the Server is unavailable the banner over the page says so; the page adds no toast or note of its own.
Then(
  'the Connection leaves an unavailable Server to the banner',
  async ({ app, page }): Promise<void> => {
    await app.restartEngine(async () => {
      // A fresh App has no cached details: its real query must cross the unavailable Server boundary.
      await reloadApp(page);
      await viewConnection(page);
      await expect(banner(page)).toBeVisible({ timeout: 20_000 });
      await expect(shownToasts(page)).toHaveCount(0);
      await expect(
        page.getByText('Connecting to the Server…', { exact: true }),
      ).toHaveCount(0);
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

import type { Locator, Page } from '@playwright/test';
import { expect, serverVersion } from '../fixtures';
import { When, Then } from './fixtures';
import { openConnection } from './frame';

// A Server row is named "<label>, <value>".
function row(page: Page, label: string): Locator {
  return page.getByRole('group', { name: new RegExp(`^${label}, `) });
}

When('I view the Connection', async ({ page }): Promise<void> => {
  await openConnection(page);
});

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

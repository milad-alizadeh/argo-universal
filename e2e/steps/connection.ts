import type { Locator, Page } from '@playwright/test';
import { expect, serverVersion } from '../fixtures';
import { When, Then } from './fixtures';
import { openConnection } from './frame';

function rowValue(page: Page, label: string): Locator {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=following-sibling::*[1]');
}

When('I view the Connection', async ({ page }): Promise<void> => {
  await openConnection(page);
});

Then(
  'the Connection shows the Server version',
  async ({ page }): Promise<void> => {
    await expect(rowValue(page, 'Version')).toHaveText(serverVersion);
  },
);

Then(
  'the Connection follows the Server clock',
  async ({ page }): Promise<void> => {
    const clock = rowValue(page, 'Clock');
    await expect(clock).toHaveText(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    const first = await clock.textContent();
    await expect(clock).not.toHaveText(first ?? '');
    const second = await clock.textContent();
    await expect(clock).not.toHaveText(second ?? '');
  },
);

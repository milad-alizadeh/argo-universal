import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, Then, When } from './fixtures';
import { reloadApp } from './frame';
import { settingsModal } from './navigation';

const picker = (page: Page, title: string): Locator =>
  settingsModal(page).getByRole('button', { name: title, exact: true });

When(
  'I open {string} from the Settings list',
  async ({ page }, name: string) => {
    await settingsModal(page).getByRole('link', { name, exact: true }).click();
  },
);

When('I open the {string} Settings picker', async ({ page }, title: string) => {
  await picker(page, title).click();
});

When(
  'I choose {string} from the Settings picker',
  async ({ page }, name: string) => {
    await page.getByRole('option', { name, exact: true }).click();
  },
);

When(
  'I choose {string} from the Appearance menu',
  async ({ page }, name: string) => {
    await page.getByRole('menuitemradio', { name, exact: true }).click();
  },
);

Then(
  '{string} shows {string} in the Settings modal',
  async ({ page }, title: string, value: string) => {
    await expect(settingsModal(page)).toBeVisible();
    await expect(picker(page, title)).toContainText(value);
  },
);

When(
  /^I press Escape in the Settings (listbox|menu)$/,
  async ({ page }, role: 'listbox' | 'menu') => {
    const popup = page.getByRole(role);
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
  },
);

Then('the Settings picker offers {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
});

Then('the Settings modal remains open', async ({ page }) => {
  await expect(settingsModal(page)).toBeVisible();
});

Given(
  'a {int} by {int} Frame',
  async ({ page }, width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await reloadApp(page);
  },
);

When(
  'I drag from the dim to the {string} Settings picker',
  async ({ page }, title: string) => {
    const tile = page.getByRole('button', {
      name: 'Settings',
      exact: true,
      includeHidden: true,
    });
    const [dim, box] = await Promise.all([
      tile.boundingBox(),
      picker(page, title).boundingBox(),
    ]);
    if (!dim || !box) throw new Error('The rail tile or picker has no bounds.');

    await page.mouse.move(dim.x + dim.width / 2, dim.y + dim.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.up();
  },
);

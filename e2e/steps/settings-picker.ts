import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, Then, When } from './fixtures';
import { reloadApp } from './frame';

const settings = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Settings', exact: true });

const picker = (page: Page, title: string): Locator =>
  settings(page).getByRole('button', { name: title, exact: true });

When(
  'I open {string} from the Settings list',
  async ({ page }, name: string) => {
    await settings(page).getByRole('link', { name, exact: true }).click();
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
    await expect(settings(page)).toBeVisible();
    await expect(picker(page, title)).toContainText(value);
  },
);

When('I press Escape in the Settings picker', async ({ page }) => {
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(listbox).toHaveCount(0);
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
    const box = await picker(page, title).boundingBox();
    if (!box) throw new Error('The Settings picker has no bounds.');

    await page.mouse.move(20, 100);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.up();
  },
);

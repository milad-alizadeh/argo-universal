import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { sessionRow } from './live-session';

// The row's press and its Plugin items' links, side by side: a link is never inside the row's button.
const sessionRowParts = (page: Page, title: string): Locator =>
  sessionRow(page, title).locator('xpath=..');

// A Plugin item with a page is a link beside the Session row's press, named by its text and its Plugin.
const sessionRowItem = (page: Page, title: string, text: string): Locator =>
  sessionRowParts(page, title).getByRole('link', {
    name: new RegExp(`^${text}, `),
  });

Then(
  'the Session row {string} shows the Plugin item {string}',
  async ({ page }, title: string, text: string): Promise<void> => {
    await expect(sessionRowItem(page, title, text)).toBeVisible();
  },
);

When(
  'I press the Plugin item {string} on the Session row {string}',
  async ({ page }, text: string, title: string): Promise<void> => {
    await sessionRowItem(page, title, text).click();
  },
);

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then, When } from './fixtures';

// The fixture Plugins' cards in the Workbench column, keyed by the Plugin and the card each declares.
const cardIds: Record<string, string> = {
  'Counter card': 'workbench-plugin:counter/counter-card',
  Notes: 'workbench-plugin:lists/notes',
};

const cardOf = (page: Page, title: string): Locator =>
  page.getByTestId(cardIds[title] ?? title);

Then(
  'the Session Workbench shows the Plugin card {string}',
  async ({ page }, title: string): Promise<void> => {
    const card = cardOf(page, title);

    await expect(card).toBeVisible();
    await expect(card.getByText(title, { exact: true })).toBeVisible();
  },
);

Then(
  'the Session Workbench has no Plugin card {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(cardOf(page, title)).toHaveCount(0);
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  },
);

When(
  'I press the Plugin card {string}',
  async ({ page }, title: string): Promise<void> => {
    await page
      .getByRole('button', { name: `Open ${title} overview`, exact: true })
      .click();
  },
);

Then(
  'the Inspector tab {string} shows {string}',
  async ({ page }, tab: string, text: string): Promise<void> => {
    await expect(
      page.getByRole('tabpanel', { name: tab, exact: true }).getByText(text, {
        exact: true,
      }),
    ).toBeVisible();
  },
);

// Every action past the first, and every action on a phone, waits in the header's ⋯ menu.
When(
  'I press {string} in the Session header menu',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page
      .getByRole('menu')
      .getByRole('menuitem', { name, exact: true })
      .click();
  },
);

Then(
  'the Inspector has no tab {string}',
  async ({ page }, tab: string): Promise<void> => {
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveCount(
      0,
    );
  },
);

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then, When } from './fixtures';

// The mock Plugins' cards in the Workbench column, keyed by the Plugin and the card each declares.
const cardKeys = new Map([
  ['Counter card', 'counter/counter-card'],
  ['Notes', 'lists/notes'],
]);

const pluginCard = (page: Page, title: string): Locator =>
  page.getByTestId(`workbench-plugin:${cardKeys.get(title)}`);

Then(
  'the Session Workbench shows the Plugin card {string}',
  async ({ page }, title: string): Promise<void> => {
    const card = pluginCard(page, title);

    await expect(card).toBeVisible();
    await expect(card.getByText(title, { exact: true })).toBeVisible();
  },
);

Then(
  'the Session Workbench has no Plugin card {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(pluginCard(page, title)).toHaveCount(0);
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
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

/*
 * Flips the Lists mock's Notes switch for the Session. A press that lands while the page's first view is replaced is
 * refused with "try again", so it is pressed again until the switch reads the other way.
 */
When(
  'I {word} the Notes card on the Plugin page',
  async ({ page }, verb: string): Promise<void> => {
    const [press, next] =
      verb === 'fill'
        ? ['Fill the Notes card', 'Empty the Notes card']
        : ['Empty the Notes card', 'Fill the Notes card'];

    const button = (name: string): Locator =>
      page
        .getByTestId('plugin-page')
        .getByRole('button', { name, exact: true });

    await expect(async () => {
      if (await button(next).isVisible()) return;

      await button(press).click({ timeout: 2000 });
      await expect(button(next)).toBeVisible({ timeout: 2000 });
    }).toPass();
  },
);

When('I go back to the Session', async ({ page }): Promise<void> => {
  await page.goBack();
});

// The header's ⋯ menu lists an action only while what it opens is there.
Then(
  'the Session header menu {word} {string}',
  async ({ page }, has: string, name: string): Promise<void> => {
    await page.getByRole('button', { name: 'More', exact: true }).click();

    const item = page
      .getByRole('menu')
      .getByRole('menuitem', { name, exact: true });

    await expect(item).toHaveCount(has === 'lists' ? 1 : 0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
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

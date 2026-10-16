import type { Page, Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then, test } from './fixtures';
import { onPhone } from './frame';

When(
  'I open the {word} Plugin',
  async ({ page }, title: string): Promise<void> => {
    if (onPhone(page)) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await capture(page, `drawer-before-${title}`);
    }

    await page.getByRole('button', { name: title, exact: true }).click();
  },
);

Then(
  'the Plugin page shows {}',
  async ({ page }, name: string): Promise<void> => {
    await expect(page).toHaveURL(pluginUrl(name));
    await expect(pluginHeading(page, name)).toBeVisible();

    if (!onPhone(page))
      await expect(
        page.getByRole('button', { name: /^(Hide|Show) sidebar$/ }),
      ).toHaveCount(0);

    await capture(page, name);
  },
);

Then(
  'the Rail lists core sections before Plugin items',
  async ({ page }): Promise<void> => {
    const items = page
      .getByTestId('desktop-rail')
      .getByRole('button', { name: /^(Sessions|Settings|Issues|Hello)$/ });

    const names = ['Sessions', 'Settings', 'Issues', 'Hello'];

    await expect(items).toHaveCount(names.length);

    for (const [index, name] of names.entries())
      await expect(items.nth(index)).toHaveAccessibleName(name);
  },
);

const pluginUrl = (name: string): RegExp =>
  name === 'Hello'
    ? /\/plugins\/hello\/hello$/
    : /\/plugins\/issue-tracker\/issues$/;

const pluginHeading = (page: Page, name: string): Locator =>
  page
    .getByTestId('plugin-page')
    .getByRole('heading', { name, exact: true, level: 1 });

async function capture(page: Page, name: string): Promise<void> {
  if (!onPhone(page)) await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    animations: 'disabled',
  });
}

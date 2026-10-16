import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone } from './frame';

const sectionNames = ['Sessions', 'Settings', 'Issues', 'Hello'];

// A phone Frame lists sections in the Drawer behind ☰; a wide one in its Rail.
async function navigation(page: Page): Promise<Locator> {
  if (!onPhone(page)) return page.getByTestId('desktop-rail');

  await page.getByRole('button', { name: 'Open navigation' }).click();

  return page.getByTestId('phone-drawer');
}

When(
  'I open the {word} Plugin',
  async ({ page }, title: string): Promise<void> => {
    await (
      await navigation(page)
    )
      .getByRole('button', { name: title, exact: true })
      .click();
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
  },
);

Then(
  'the navigation lists core sections before Plugin items',
  async ({ page }): Promise<void> => {
    const items = (await navigation(page)).getByRole('button', {
      name: /^(Sessions|Settings|Issues|Hello)$/,
    });

    await expect(items).toHaveCount(sectionNames.length);

    for (const [index, name] of sectionNames.entries())
      await expect(items.nth(index)).toHaveAccessibleName(name);
  },
);

const pluginPage = 'plugin-page';

const pluginUrl = (name: string): RegExp =>
  name === 'Hello'
    ? /\/plugins\/hello\/hello$/
    : /\/plugins\/issue-tracker\/issues$/;

// Hello draws its own page from the wire; the other Plugins have no page yet, only the frame that holds it.
const pluginHeading = (page: Page, name: string): Locator =>
  name === 'Hello'
    ? page.getByTestId(pluginPage).getByText('Hello from a Plugin')
    : page.getByTestId(pluginPage);

When(
  'I press {string} on the Plugin page',
  async ({ page }, name: string): Promise<void> => {
    await page
      .getByTestId(pluginPage)
      .getByRole('button', { name, exact: true })
      .click();
  },
);

Then(
  'the Plugin page text reads {string}',
  async ({ page }, text: string): Promise<void> => {
    await expect(page.getByTestId(pluginPage).getByText(text)).toBeVisible();
  },
);

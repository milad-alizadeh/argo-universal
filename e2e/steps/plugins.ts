import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone, phone, wide } from './frame';

const sectionNames = ['Sessions', 'Settings', 'Counter', 'Lists'];

// A phone Frame lists sections in the Drawer behind ☰; a wide one in its Rail.
async function navigation(page: Page): Promise<Locator> {
  if (!onPhone(page)) return page.getByTestId('desktop-rail');

  await page.getByRole('button', { name: 'Open navigation' }).click();

  return page.getByTestId('phone-drawer');
}

When('I open the {} Plugin', async ({ page }, title: string): Promise<void> => {
  await (
    await navigation(page)
  )
    .getByRole('button', { name: title, exact: true })
    .click();
});

When(
  'I resize to a {word} Frame',
  async ({ page }, frame: string): Promise<void> => {
    await page.setViewportSize(frame === 'phone' ? phone : wide);
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
      name: /^(Sessions|Settings|Counter|Lists)$/,
    });

    await expect(items).toHaveCount(sectionNames.length);

    for (const [index, name] of sectionNames.entries())
      await expect(items.nth(index)).toHaveAccessibleName(name);
  },
);

const pluginPage = 'plugin-page';

const pluginUrl = (name: string): RegExp =>
  name === 'Counter'
    ? /\/plugins\/counter\/counter$/
    : /\/plugins\/lists\/lists\/lists$/;

const pluginHeading = (page: Page, name: string): Locator =>
  page
    .getByTestId(pluginPage)
    .getByText(name === 'Counter' ? 'Counter fixture' : 'Deploy web', {
      exact: true,
    });

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

When('I open the Server Project', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: /^project,/ }).click();
});

Then(
  'the Plugin row {string} is selected',
  async ({ page }, name: string): Promise<void> => {
    await expect(
      page.getByTestId(pluginPage).getByRole('button', { name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  },
);

Then(
  'the Project details show the fixture Plugin Slot',
  async ({ page }): Promise<void> => {
    await expect(page.getByText(/^Fixture Slot for /)).toBeVisible();
  },
);

Then(
  'the Plugin detail actions fit in the viewport',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('button', { name: 'Back to counter', exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole('button', { name: 'Open documentation', exact: true }),
    ).toBeInViewport();
  },
);

Then(
  'the Plugin item shows its content and Metadata',
  async ({ page }): Promise<void> => {
    await expect(page.getByText('Fixture item content.')).toBeVisible();

    for (const field of [
      'Status, Open',
      'Assignee, Ana Ruiz',
      'Labels, fixture',
      'Opened, Today',
      'Docs, example.com',
    ])
      await expect(page.getByRole('group', { name: field })).toBeVisible();
  },
);

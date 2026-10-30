import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone, phone, wide } from './frame';
import { expectMessage } from './new-session';

const sectionNames = ['Sessions', 'Settings', 'Counter', 'Lists', 'Issues'];

// A phone Frame lists sections in the Drawer behind ☰; a wide one in its Rail.
export async function navigation(page: Page): Promise<Locator> {
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
      name: /^(Sessions|Settings|Counter|Lists|Issues)$/,
    });

    await expect(items).toHaveCount(sectionNames.length);

    for (const [index, name] of sectionNames.entries())
      await expect(items.nth(index)).toHaveAccessibleName(name);
  },
);

const pluginPage = 'plugin-page';

// A page opened for a Session carries it in the query.
const pluginUrl = (name: string): RegExp =>
  name === 'Counter'
    ? /\/plugins\/counter\/counter(\?sessionId=[^&]+)?$/
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
  await page.getByRole('link', { name: 'project', exact: true }).click();
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

When(
  'I open the Plugin row {string}',
  async ({ page }, name: string): Promise<void> => {
    await page.getByText(name, { exact: true }).click();
  },
);

Then(
  'the Plugin page heading reads {string}',
  async ({ page }, name: string): Promise<void> => {
    // On a phone the stack's header draws the page title, outside the Plugin page.
    await expect(page.getByRole('heading', { name })).toBeVisible();
  },
);

// A root ListDetail's list sits in the Frame's sidebar, beside the page.
Then(
  'the Plugin list shows {string} in the sidebar',
  async ({ page }, name: string): Promise<void> => {
    await expect(
      page.getByTestId('desktop-list').getByText(name, { exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the Plugin page says {string}',
  async ({ page }, text: string): Promise<void> => {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  },
);

Then(
  'the Plugin row {string} is hidden',
  async ({ page }, name: string): Promise<void> => {
    await expect(page.getByText(name, { exact: true })).toBeHidden();
  },
);

Then('New Session opens with this draft:', async ({ page }, draft: string) => {
  await expect(page).toHaveURL(/\/sessions\/new\?/);
  await expectMessage(page, draft);
});

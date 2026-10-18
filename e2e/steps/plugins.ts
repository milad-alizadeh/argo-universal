import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { onPhone, phone } from './frame';

const sectionNames = ['Sessions', 'Settings', 'Issues', 'Hello'];

const run = promisify(execFile);

Given(
  'the Server Project has a GitHub origin',
  async ({ app }): Promise<void> => {
    await run('git', [
      '-C',
      app.projectPath,
      'remote',
      'add',
      'origin',
      'git@github.com:owner/repository.git',
    ]);
  },
);

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

When('I resize to a phone Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(phone);
});

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

When('I open the Server Project', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: /^project,/ }).click();
});

When('I choose GitHub Issues', async ({ page }): Promise<void> => {
  const button = page.getByRole('button', {
    name: 'GitHub Issues',
    exact: true,
  });

  await expect(button).toBeEnabled();
  await button.click();
});

Then(
  'the Issues page shows the fixture Issue',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('button', { name: /#42 Fixture issue from GitHub/ }),
    ).toBeVisible();
  },
);

When('I open the fixture Issue', async ({ page }): Promise<void> => {
  await page
    .getByRole('button', { name: /#42 Fixture issue from GitHub/ })
    .click();
});

Then(
  'the Issue page shows its description',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByText('This Issue came from the fixture gh executable.'),
    ).toBeVisible();
  },
);

Then(
  'the Issue actions fit in the phone Frame',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('button', { name: 'Back to Issues', exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole('button', { name: 'Close Issue', exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole('button', { name: 'Open in GitHub', exact: true }),
    ).toBeInViewport();
  },
);

Then(
  'the Plugin row {string} is selected',
  async ({ page }, name: string): Promise<void> => {
    await expect(
      page.getByTestId(pluginPage).getByRole('button', { name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  },
);

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import {
  type FixturePullRequest,
  pullRequests,
  repository,
} from '../github-pulls';
import { Then, When } from './fixtures';

const fourth = pullRequests[3];

if (!fourth) throw new Error('The fixture needs four pull requests');

const previewRows = (page: Page): Locator =>
  page.getByRole('button', { name: /^Open files of Change #/ });

Then(
  'the Workbench previews three Open Changes',
  async ({ page }): Promise<void> => {
    await expect(previewRows(page)).toHaveCount(3);
  },
);

Then(
  'the Workbench groups the fourth as {string}',
  async ({ page }, remainder: string): Promise<void> => {
    await expect(
      page.getByRole('button', { name: remainder, exact: true }),
    ).toBeVisible();
  },
);

When(
  'I open the list of Changes from the Workbench',
  async ({ page }): Promise<void> => {
    await page
      .getByRole('button', { name: '1 more open', exact: true })
      .click();
  },
);

const panel = (page: Page): Locator =>
  page.getByRole('tabpanel', { name: 'Changes', exact: true });

const rowOf = (page: Page, number: number): Locator =>
  panel(page).getByRole('button', {
    name: new RegExp(`^Show Change ${repository}#${number},`),
  });

Then(
  'the Inspector lists all four pull requests',
  async ({ page }): Promise<void> => {
    for (const { number } of pullRequests)
      await expect(rowOf(page, number)).toBeVisible();
  },
);

When('I select the fourth pull request', async ({ page }): Promise<void> => {
  await rowOf(page, fourth.number).click();
});

Then(
  'the Inspector shows the fourth pull request with its own Checks {string}',
  async ({ page }, checks: string): Promise<void> => {
    const inspector = panel(page);

    await expect(
      inspector.getByText(fourth.title, { exact: true }),
    ).toBeVisible();
    await expect(inspector.getByText(checks, { exact: true })).toBeVisible();
    await expect(
      inspector.getByRole('button', { name: 'Back to Changes' }),
    ).toBeVisible();
  },
);

When('I open its files', async ({ page }): Promise<void> => {
  await panel(page).getByRole('button', { name: 'Files', exact: true }).click();
});

const fileHeader = (page: Page, filename: string): Locator =>
  panel(page).getByRole('button', { name: `Diff for ${filename}` });

async function expectFilesOf(
  page: Page,
  pull: FixturePullRequest,
  count: number,
): Promise<void> {
  for (const { filename } of pull.files)
    await expect(fileHeader(page, filename)).toHaveCount(count);
}

Then(
  'the Inspector lists the files of the fourth pull request and no others',
  async ({ page }): Promise<void> => {
    await expectFilesOf(page, fourth, 1);

    for (const pull of pullRequests.slice(0, 3))
      await expectFilesOf(page, pull, 0);
  },
);

Then(
  "the diff of the fourth pull request's first file shows its lines",
  async ({ page }): Promise<void> => {
    const [file] = fourth.files;

    if (!file) throw new Error('The fourth pull request needs files');

    await expect(
      panel(page)
        .getByText(`added in ${file.filename}`, { exact: true })
        .first(),
    ).toBeVisible();
  },
);

When('I go back to the list of Changes', async ({ page }): Promise<void> => {
  await panel(page)
    .getByRole('button', { name: 'Change', exact: true })
    .click();
  await panel(page).getByRole('button', { name: 'Back to Changes' }).click();
});

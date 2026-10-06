import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

// The rail's badge, read as a number; the web project's Server is shared, so tests compare counts rather than expect zero.
async function readAttention(page: Page) {
  const badge = page.getByLabel(/^\d+ Sessions? needs? attention$/);
  if ((await badge.count()) === 0) return 0;
  return Number(await badge.textContent());
}

test('the Sessions list and badge follow a Session live, and search and the filter narrow it', async ({
  page,
}, testInfo) => {
  // A title of its own, so other tests' and earlier retries' Sessions never match.
  const title = `Check the live list ${testInfo.project.name} ${testInfo.retry}`;
  const row = page.getByRole('button', { name: new RegExp(`^${title}, `) });
  await expect(
    page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('desktop-shell')).toBeVisible();
  const attentionBefore = await readAttention(page);

  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(
    page.getByText('Start the Session in', { exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Message' }).fill(title);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/[^/]+$/);

  // The sidebar list shows the new Session and its Turn ending without a reload.
  await expect(row).toBeVisible();
  await expect(
    page.getByRole('button', { name: `${title}, Unread`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(
      `${attentionBefore + 1} ${attentionBefore === 0 ? 'Session needs' : 'Sessions need'} attention`,
      { exact: true },
    ),
  ).toHaveText(String(attentionBefore + 1));

  await page
    .getByRole('button', { name: 'Search Sessions', exact: true })
    .click();
  const search = page.getByPlaceholder('Search Sessions');
  await search.fill(title.toUpperCase());
  await expect(row).toBeVisible();
  await search.fill(`${title} that matches nothing`);
  await expect(
    page.getByText('No matching Sessions', { exact: true }),
  ).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Close search', exact: true }).click();
  await expect(row).toBeVisible();

  await page.getByRole('button', { name: 'Filter Sessions' }).click();
  await page
    .getByRole('menuitemradio', { name: 'Archived', exact: true })
    .click();
  await expect(
    page.getByText('No archived Sessions', { exact: true }),
  ).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Filter Sessions' }).click();
  await page
    .getByRole('menuitemradio', { name: 'Active', exact: true })
    .click();
  await expect(row).toBeVisible();
});

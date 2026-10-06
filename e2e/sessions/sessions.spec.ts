import { expect, test } from '../fixtures';

test('Sessions loads from the Server, filters, and opens New Session', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('No Sessions yet.', { exact: true }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Search Sessions', exact: true })
    .click();
  const search = page.getByPlaceholder('Search Sessions');
  await search.fill('build');
  await expect(
    page.getByText('No matching Sessions', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close search', exact: true }).click();
  await expect(
    page.getByText('No Sessions yet.', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Filter Sessions' }).click();
  await page
    .getByRole('menuitemradio', { name: 'Archived', exact: true })
    .click();
  await expect(
    page.getByText('No archived Sessions', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Filter Sessions' }).click();
  await page
    .getByRole('menuitemradio', { name: 'Active', exact: true })
    .click();
  await expect(
    page.getByText('No Sessions yet.', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(
    page.getByText('Start the Session in', { exact: true }),
  ).toBeVisible();
});

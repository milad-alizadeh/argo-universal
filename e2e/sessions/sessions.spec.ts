import { expect, test } from '../fixtures';

// The badge's label for `count` Sessions, as the rail and the drawer word it.
const attentionLabel = (count: number): string =>
  `${count} ${count === 1 ? 'Session needs' : 'Sessions need'} attention`;

test('the Sessions list and badge follow a Session live, and search and the filter narrow it', async ({
  page,
}): Promise<void> => {
  const title = 'Check the live list';
  const row = page.getByRole('button', { name: new RegExp(`^${title}, `) });
  await expect(
    page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('desktop-shell')).toBeVisible();

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
  const attention = page.getByLabel(attentionLabel(1), {
    exact: true,
  });
  await expect(attention).toHaveText('1');

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

  // A phone draws the same count in the drawer.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: /back/i }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(attention).toHaveText('1');
});

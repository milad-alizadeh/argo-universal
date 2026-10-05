import { expect, test } from '../fixtures';

const wide = { width: 1280, height: 800 };
const phone = { width: 390, height: 844 };

test('crossing 720 px swaps the shell and keeps the URL and the open detail', async ({
  page,
}) => {
  const desktopShell = page.getByTestId('desktop-shell');
  const phoneShell = page.getByTestId('phone-shell');
  const connection = page.getByText('Version', { exact: true });

  await page.setViewportSize(wide);
  await expect(desktopShell).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  // A wide window opens Accounts beside the Settings list.
  await expect(page.getByText('Accounts will appear here.')).toBeVisible();
  await page.getByRole('button', { name: 'Connection', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/connection$/);
  await expect(connection).toBeVisible();

  await page.setViewportSize(phone);
  await expect(desktopShell).toHaveCount(0);
  await expect(page).toHaveURL(/\/settings\/connection$/);
  await expect(connection).toBeVisible();

  await page.setViewportSize(wide);
  await expect(desktopShell).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/connection$/);
  await expect(connection).toBeVisible();

  // On a phone, the section root shows its list, and a wide window adds Accounts again.
  await page.setViewportSize(phone);
  await page.goBack();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(phoneShell).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accounts' })).toBeVisible();
  await expect(page.getByText('Accounts will appear here.')).toHaveCount(0);

  await page.setViewportSize(wide);
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText('Accounts will appear here.')).toBeVisible();
});

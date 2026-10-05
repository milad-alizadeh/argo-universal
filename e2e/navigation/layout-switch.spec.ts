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

test('Back from a page opened on its own returns to its section list', async ({
  page,
  appTarget,
}) => {
  test.skip(appTarget === 'electron', 'Electron opens only the app root');
  await page.setViewportSize(phone);
  // `expo serve` serves the single-page export only at `/`, so the App starts from a rewritten URL instead.
  await page.addInitScript(
    "if (location.pathname === '/') history.replaceState(null, '', '/settings/connection')",
  );
  await page.reload();
  await expect(page.getByText('Version', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /back/i }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId('phone-shell')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();
});

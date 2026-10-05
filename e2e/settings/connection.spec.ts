import { expect, serverVersion, test } from '../fixtures';

test('the Connection page shows the Server version and a ticking clock', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Connection', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/connection$/);

  // Each row shows its label and, next to it, its value.
  const rowValue = (label: string) =>
    page
      .getByText(label, { exact: true })
      .locator('xpath=following-sibling::*[1]');

  await expect(rowValue('Version')).toHaveText(serverVersion);

  // system.clock sends an ISO time every second; the row shows the latest one.
  const clock = rowValue('Clock');
  await expect(clock).toHaveText(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  const first = await clock.textContent();
  await expect(clock).not.toHaveText(first ?? '');
  const second = await clock.textContent();
  await expect(clock).not.toHaveText(second ?? '');
});

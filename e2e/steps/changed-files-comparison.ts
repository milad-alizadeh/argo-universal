import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { openChangedFiles } from './changed-files';
import { When } from './fixtures';
import { onPhone } from './frame';

When("I review the Frame's file comparison", async ({ page }) => {
  await (onPhone(page)
    ? inspectPhoneSheet(page)
    : reviewDesktopComparison(page));
});

async function reviewDesktopComparison(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await compareAgainstRemote(page);
  await page
    .getByRole('button', { name: 'Diff for greeting.txt', exact: true })
    .click();
}

// Paper's phone Git sheet contains the panels, without a separate title or comparison bar.
async function inspectPhoneSheet(page: Page): Promise<void> {
  await openChangedFiles(page);
  await expect(
    page.getByRole('button', { name: 'Files', pressed: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Change', exact: true }),
  ).toBeDisabled();
  await expectNoExtraHeader(page);
}

async function expectNoExtraHeader(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Changes', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Close Inspector', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Comparison/ })).toHaveCount(
    0,
  );
}

// The desktop Inspector keeps its comparison controls and resolves a remote ref against the Checkout.
async function compareAgainstRemote(page: Page): Promise<void> {
  const comparison = page.getByRole('button', { name: /^Comparison/ });

  await comparison.click();
  await page.getByRole('radio', { name: 'origin/main', exact: true }).click();
  await expect(comparison).toContainText('Compare Against origin/main');
}

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { liveSessionRow } from './live-session';

const archivedToastTitle = 'Session archived';

// The right-click menu on the Session's row.
async function openRowMenu(page: Page, title: string): Promise<Locator> {
  await page
    .getByRole('button', { name: new RegExp(`^${title}, `) })
    .click({ button: 'right' });

  return page.getByRole('menu');
}

When(
  'I archive the Session {string} from its row',
  async ({ page }, title: string): Promise<void> => {
    const menu = await openRowMenu(page, title);
    await menu.getByRole('menuitem', { name: 'Archive', exact: true }).click();
  },
);

Then(
  'the Sessions list no longer shows the live Session',
  async ({ page }): Promise<void> => {
    await expect(liveSessionRow(page)).toHaveCount(0);
  },
);

Then(
  'a {string} toast offers Undo',
  async ({ page }, title: string): Promise<void> => {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeVisible();
  },
);

When('I undo the archive', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText(archivedToastTitle, { exact: true })).toHaveCount(
    0,
  );
});

Then(
  'the Session page shows {string} instead of the Composer',
  async ({ page }, banner: string): Promise<void> => {
    await expect(page.getByText(banner, { exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Message' })).toHaveCount(0);
  },
);

Then(
  'the Session {string} offers Rename but not Archive',
  async ({ page }, title: string): Promise<void> => {
    const menu = await openRowMenu(page, title);
    await expect(
      menu.getByRole('menuitem', { name: 'Archive', exact: true }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
      menu.getByRole('menuitem', { name: 'Rename', exact: true }),
    ).toBeEnabled();
  },
);

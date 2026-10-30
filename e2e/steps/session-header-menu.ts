import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { sessionWithStatus } from './live-session';

// ⋯ in the open Session's header.
async function openHeaderMenu(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'More', exact: true }).click();

  return page.getByRole('menu');
}

When(
  'I rename the open Session to {string} from its header',
  async ({ page }, title: string): Promise<void> => {
    const menu = await openHeaderMenu(page);
    await menu.getByRole('menuitem', { name: 'Rename', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(title);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  },
);

Then(
  'the Session page and its row are titled {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await expect(sessionWithStatus(page, title, 'Idle')).toBeVisible();
  },
);

When(
  'I archive the open Session from its header',
  async ({ page }): Promise<void> => {
    const menu = await openHeaderMenu(page);
    await menu.getByRole('menuitem', { name: 'Archive', exact: true }).click();
  },
);

// A Plugin's first header action: a button beside ⋯ on the web.
When(
  'I press {string} in the Session header',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('button', { name, exact: true }).click();
  },
);

// The page was opened from a Session's header, so the Plugin read that Session's id from its context.
Then(
  'the Plugin page opened for that Session',
  async ({ page }): Promise<void> => {
    const sessionId = new URL(page.url()).searchParams.get('sessionId');

    expect(sessionId).toBeTruthy();
    await expect(
      page.getByText(`Opened for Session ${sessionId}`, { exact: true }),
    ).toBeVisible();
  },
);

/*
 * A phone goes back to its list; a wide Frame shows the list beside New Session. Neither page owns a Session, so the
 * band draws no Session controls, and a page with no Screen Actions of its own leaves no "More" at any width.
 */
Then('no Session page is open', async ({ page }): Promise<void> => {
  await expect(page).toHaveURL(/\/sessions(\/new)?$/);
  await expect(
    page.getByRole('button', { name: 'More', exact: true }),
  ).toHaveCount(0);
});

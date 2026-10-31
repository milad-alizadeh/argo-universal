import { realpathSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { localRequests } from './agent-requests';
import { Given, When, Then } from './fixtures';
import {
  archivedSessionRow,
  liveSessionRow,
  openSessionRow,
  sessionRow,
} from './live-session';

const archivedToastTitle = /session archived/i;

const uncommittedFile = 'pending.txt';

const uncommittedContents = 'Uncommitted work\n';

const checkoutPath = (app: {
  projectPath: string;
  requestLogPath: string;
}): string => {
  const projectPath = realpathSync(app.projectPath);

  const checkout = localRequests(app, 'session/new')
    .map((request) => request.params?.cwd)
    .findLast((cwd) => cwd !== undefined && realpathSync(cwd) !== projectPath);

  if (!checkout) throw new Error('The Agent did not open a worktree Checkout');

  return checkout;
};

Given(
  "an uncommitted file in the Session's Checkout",
  async ({ app }): Promise<void> => {
    await writeFile(
      join(checkoutPath(app), uncommittedFile),
      uncommittedContents,
    );
  },
);

Then(
  "the uncommitted file remains in the Session's Checkout",
  async ({ app }): Promise<void> => {
    // A cancelled archive must not remove the Checkout at its five-second deadline.
    await setTimeout(5_500);

    expect(
      await readFile(join(checkoutPath(app), uncommittedFile), 'utf8'),
    ).toBe(uncommittedContents);
  },
);

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
  'a toast announces the archive and offers Undo',
  async ({ page }): Promise<void> => {
    await expect(page.getByText(archivedToastTitle)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeVisible();
  },
);

When('I undo the archive', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText(archivedToastTitle)).toHaveCount(0);
});

Then(
  'the Archived filter shows the Session {string}',
  async ({ page }, title: string): Promise<void> => {
    // A row's text lives in lanes beside its press target, which a Plugin item can empty, so its name says Archived.
    const row = archivedSessionRow(page, title);

    await expect(row).toBeVisible();
  },
);

When(
  'I open the archived Session {string}',
  async ({ page }, title: string): Promise<void> => {
    await openSessionRow(page, sessionRow(page, title), title);
  },
);

Then(
  'the Session page is read-only instead of showing the Composer',
  async ({ page }): Promise<void> => {
    await expect(page.getByText(/read-only/i)).toBeVisible();
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

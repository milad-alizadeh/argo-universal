import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { compactFrame, phone, reloadApp } from './frame';

// The Server's own Project is the test repository it was started with, named after its folder.
const projectName = 'project';

// A reload or a typed address starts the App on a page with no history behind it.
async function openOnItsOwn(page: Page, path: string): Promise<void> {
  await page.setViewportSize(phone);
  await page.addInitScript(
    `if (location.pathname === '/') history.replaceState(null, '', '${path}')`,
  );
  await reloadApp(page);
}

// The address names the list alone: no route parameter has leaked into it as a query.
async function expectCleanAddress(page: Page, path: string): Promise<void> {
  await expect(page.getByTestId(compactFrame)).toBeVisible();
  await expect
    .poll(() => {
      const { pathname, search } = new URL(page.url());

      return `${pathname}${search}`;
    })
    .toBe(path);
}

Given(
  'the Project page was opened on its own in a phone Frame',
  async ({ page }): Promise<void> => {
    await openOnItsOwn(page, `/settings/projects/${projectName}`);
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
  },
);

Given(
  'a missing Session was opened on its own in a phone Frame',
  async ({ page }): Promise<void> => {
    await openOnItsOwn(page, '/sessions/missing');
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
  },
);

Then(
  'the phone Frame shows the Projects list with a clean address',
  async ({ page }): Promise<void> => {
    await expectCleanAddress(page, '/settings/projects');
  },
);

Then(
  'the phone Frame shows the Sessions list with a clean address',
  async ({ page }): Promise<void> => {
    await expectCleanAddress(page, '/sessions');
  },
);

When('I go Back from the page', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: /back/i }).click();
});

// The fixture Issues Plugin's row, at the address the list pushes it at.
Given(
  'the Plugin row {string} was opened on its own in a phone Frame',
  async ({ page }, name: string): Promise<void> => {
    await openOnItsOwn(page, '/plugins/lists/issues/issues/418');
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  },
);

Then(
  'the phone Frame shows the Issues list with a clean address',
  async ({ page }): Promise<void> => {
    await expectCleanAddress(page, '/plugins/lists/issues/issues');
  },
);

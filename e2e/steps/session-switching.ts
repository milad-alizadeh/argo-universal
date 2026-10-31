import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';
import { openSessionRow, sessionRow, startSession } from './live-session';
import { returnToSessions } from './navigation';
import { agentModelLabel } from './new-session';

const feed = (page: Page): Locator => page.getByTestId('feed-scroll');

// The row press is checked where every step checks it, so a swallowed press is named before the Feed is blamed.
export async function openSession(page: Page, title: string): Promise<void> {
  await openSessionRow(page, sessionRow(page, title), title);
  await expect(feed(page)).toContainText(title);
}

Given(
  'Sessions named {string} and {string}',
  async ({ page }, first: string, second: string): Promise<void> => {
    await startSession(page, first);
    await startSession(page, second);
  },
);

When(
  'I open the Session {string}',
  async ({ page }, title: string): Promise<void> => {
    await openSession(page, title);
  },
);

// The Session page unmounts and mounts again: a phone goes back to its list; a wide Frame swaps the page for New Session.
When(
  'I leave the Session {string} and open it again',
  async ({ page }, title: string): Promise<void> => {
    if (onPhone(page)) {
      await page.goBack();
      await expect(page).toHaveURL(/\/sessions$/);
    } else {
      await page
        .getByRole('button', { name: 'New Session', exact: true })
        .click();
      await expect(page).toHaveURL(/\/sessions\/new$/);
    }

    await openSession(page, title);
  },
);

Then(
  'the Feed shows {string} instead of {string}',
  async ({ page }, shown: string, hidden: string): Promise<void> => {
    await expect(feed(page)).toContainText(shown);
    await expect(feed(page)).not.toContainText(hidden);
  },
);

Given(
  'I left an open Agent and model for Settings',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: agentModelLabel }).click();
    await expect(
      page.getByRole('dialog', { name: agentModelLabel }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/accounts$/);
  },
);

When(
  'I return to the Session {string}',
  async ({ page }, title: string): Promise<void> => {
    await returnToSessions(page);
    await openSession(page, title);
  },
);

Then('no Agent and model overlay is shown', async ({ page }): Promise<void> => {
  await expect(page.getByRole('dialog', { name: agentModelLabel })).toHaveCount(
    0,
  );
});

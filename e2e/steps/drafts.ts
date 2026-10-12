import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { expectMessage, messageLabel, openNewSession } from './new-session';
import { openSession } from './session-switching';

async function writeDraft(page: Page, draft: string): Promise<void> {
  await page.getByRole('textbox', { name: messageLabel }).fill(draft);
  await expectMessage(page, draft);
}

Given(
  'the draft {string} in the Session {string}',
  async ({ page }, draft: string, title: string): Promise<void> => {
    await openSession(page, title);
    await writeDraft(page, draft);
  },
);

Given(
  'the draft {string} in New Session',
  async ({ page }, draft: string): Promise<void> => {
    await expect(page).toHaveURL(/\/sessions\/new$/);
    await writeDraft(page, draft);
  },
);

// The web export serves only its root, so a reload starts there and opens the page again.
async function reloadApp(page: Page): Promise<void> {
  await page.goto(new URL('/', page.url()).href);
}

When(
  'I reload the App and open the Session {string}',
  async ({ page }, title: string): Promise<void> => {
    await reloadApp(page);
    await openSession(page, title);
  },
);

When(
  'I reload the App and open New Session',
  async ({ page }): Promise<void> => {
    await reloadApp(page);
    await openNewSession(page);
  },
);

Then(
  'the Message box shows {string}',
  async ({ page }, draft: string): Promise<void> => {
    await expectMessage(page, draft);
  },
);

Then('the Message box is empty', async ({ page }): Promise<void> => {
  await expectMessage(page, '');
});

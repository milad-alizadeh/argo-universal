import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { startSession } from './live-session';

const draftText = 'A thought I have not sent yet';

const feed = (page: Page): Locator => page.getByTestId('feed-scroll');

async function openSession(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${title}, `) }).click();
  await expect(feed(page)).toContainText(title);
}

Given(
  'Sessions named {string} and {string}',
  async ({ page }, first: string, second: string): Promise<void> => {
    await startSession(page, first);
    await startSession(page, second);
  },
);

Given(
  'an unsent draft in the Session {string}',
  async ({ page }, title: string): Promise<void> => {
    await openSession(page, title);
    await page.getByRole('textbox', { name: 'Message' }).fill(draftText);
  },
);

When(
  'I open the Session {string}',
  async ({ page }, title: string): Promise<void> => {
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

Then('the Message box is empty', async ({ page }): Promise<void> => {
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('');
});

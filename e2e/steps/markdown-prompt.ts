import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then, When } from './fixtures';
import { expectMessage, messageLabel } from './new-session';

// Markdown shortcuts fire on real key events, so the text is typed key by key rather than filled.
async function typeInMessage(page: Page, text: string): Promise<void> {
  await page
    .getByRole('textbox', { name: messageLabel })
    .pressSequentially(text);
}

When(
  'I type {string} in the Message box',
  async ({ page }, text: string): Promise<void> => {
    await typeInMessage(page, text);
  },
);

When(
  'I type {string} in bold with the keyboard shortcut',
  async ({ page }, text: string): Promise<void> => {
    await page.keyboard.press('ControlOrMeta+b');
    await typeInMessage(page, text);
    await page.keyboard.press('ControlOrMeta+b');
  },
);

When('I send the typed prompt with Return', async ({ page }): Promise<void> => {
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/, {
    timeout: 15_000,
  });
  await expectMessage(page, '');
});

Then(
  'the Feed shows the prompt {string} without its markers',
  async ({ page }, shown: string): Promise<void> => {
    const feed = page.getByTestId('feed-scroll');
    await expect(feed.getByText(shown, { exact: true })).toBeVisible();
    await expect(feed.getByText(/\*\*|_Plan_/)).toHaveCount(0);
  },
);

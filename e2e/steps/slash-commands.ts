import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, When } from './fixtures';
import { messageLabel } from './new-session';

Given('Agent {int} offers the review Slash command', expectListedAgent);

const menuOption = (page: Page, name: string): Locator =>
  page.getByRole('option', { name: new RegExp(`^/${name}\\b`) });

// Discovery fills the list while the person types, so `/` is typed again until the menu offers a command.
When('I open the Slash command menu', async ({ page }): Promise<void> => {
  const message = page.getByRole('textbox', { name: messageLabel });

  await expect(async () => {
    await message.fill('');
    await message.pressSequentially('/');
    await expect(page.getByRole('option').first()).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 20_000 });
});

When(
  'I choose the Slash command {string}',
  async ({ page }, name: string): Promise<void> => {
    await menuOption(page, name).click();
  },
);

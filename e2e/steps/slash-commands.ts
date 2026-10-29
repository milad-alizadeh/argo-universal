import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectListedAgent, readAgent } from './agents';
import { Given, Then, When } from './fixtures';
import {
  agentModelLabel,
  messageLabel,
  openConfiguration,
} from './new-session';

Given('Agent {int} offers the {string} Slash command', expectListedAgent);

const menuOption = (page: Page, name: string): Locator =>
  page.getByRole('option', { name: new RegExp(`^/${name}\\b`) });

// Discovery may deliver the list after the `/` is typed; the open menu picks it up.
When('I open the Slash command menu', async ({ page }): Promise<void> => {
  const message = page.getByRole('textbox', { name: messageLabel });

  await expect(message).toBeEditable();
  await message.pressSequentially('/');
  await expect(page.getByRole('option').first()).toBeVisible({
    timeout: 20_000,
  });
});

When(
  'I choose the Slash command {string}',
  async ({ page }, name: string): Promise<void> => {
    await menuOption(page, name).click();
  },
);

When(
  'I change the Agent to Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { name } = await readAgent(page, server.httpUrl, ordinal);

    await openConfiguration(page);
    await page.getByRole('button', { name: /^Agent(?:,|$)/ }).click();
    await page.getByRole('radio', { name, exact: true }).click();
    await expect(
      page.getByRole('button', { name: /^Agent(?:,|$)/ }),
    ).toContainText(name);
    await page.getByRole('button', { name: agentModelLabel }).click();
    await expect(
      page.getByRole('dialog', { name: agentModelLabel }),
    ).toBeHidden();
  },
);

Then(
  'the Slash command menu offers {string} and not {string}',
  async ({ page }, offered: string, other: string): Promise<void> => {
    await expect(menuOption(page, offered)).toBeVisible();
    await expect(menuOption(page, other)).toHaveCount(0);
  },
);

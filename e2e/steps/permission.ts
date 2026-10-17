import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { messageLabel } from './new-session';
import { agentId } from './scenario-agents';

const composer = (page: Page): Locator => page.getByTestId('composer-column');

Given(
  'Agent {int} asks to leave plan mode',
  async ({ page, server }, ordinal: number): Promise<void> => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      id: agentId(ordinal),
    });
  },
);

Then(
  'the Permission request {string} opens over the Composer',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      composer(page).getByText(title, { exact: true }),
    ).toBeVisible();
    await expect(
      composer(page).getByRole('textbox', {
        name: messageLabel,
        includeHidden: true,
      }),
    ).toHaveCount(1);
  },
);

When('I choose {string}', async ({ page }, option: string): Promise<void> => {
  await composer(page)
    .getByRole('button', { name: option, exact: true })
    .click();
});

Then('the Permission request closes', async ({ page }): Promise<void> => {
  await expect(
    composer(page).getByRole('button', { name: /^Yes, and/ }),
  ).toHaveCount(0);
});

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { expectComposerAccepts } from './input-requests';
import { messageLabel } from './new-session';

const composer = (page: Page): Locator => page.getByTestId('composer-column');

Given('Agent {int} asks to leave plan mode', expectListedAgent);

Then(
  'the plan {string} opens over the Composer',
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

When('I show the plan', async ({ page }): Promise<void> => {
  await composer(page).getByRole('button', { name: 'Show plan' }).click();
});

Then(
  'the plan reads {string}',
  async ({ page }, text: string): Promise<void> => {
    await expect(composer(page).getByText(text, { exact: true })).toBeVisible();
  },
);

When(
  'I answer the Permission request with {string}',
  async ({ page }, option: string): Promise<void> => {
    await composer(page)
      .getByRole('button', { name: option, exact: true })
      .click();
  },
);

Then(
  'the plan {string} closes and the Composer accepts {string}',
  async ({ page }, title: string, draft: string): Promise<void> => {
    await expect(composer(page).getByText(title, { exact: true })).toHaveCount(
      0,
    );
    await expectComposerAccepts(page, draft);
  },
);

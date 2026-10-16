import type { Page } from '@playwright/test';
import { agentTitle } from '@repo/mocks/agent/title-scenarios';
import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { submitElicitationTitle } from './elicitation';
import { Given, When, Then } from './fixtures';
import { openWidePage, reloadApp } from './frame';
import { sessionRow, startSession } from './live-session';

// The question holds the Turn; the Agent sends its title only once it is answered.
Given('Agent {int} names its Session after a question', expectListedAgent);

// The answer itself does not matter: the Agent's title is fixed in its scenario.
When("I answer the Agent's question", async ({ page }): Promise<void> => {
  await submitElicitationTitle(page, 'Any answer');
});

Given(
  'I start a Session with the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await startSession(page, prompt);
  },
);

async function expectTitled(page: Page, title: string): Promise<void> {
  await expect(sessionRow(page, title)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: title, exact: true }),
  ).toBeVisible();
}

Then(
  'the Session is titled {string} in the list and its header',
  async ({ page }, title: string): Promise<void> => {
    await expectTitled(page, title);
  },
);

Then(
  "the Session is titled with the Agent's title in the list and its header",
  async ({ page }): Promise<void> => {
    await expectTitled(page, agentTitle);
  },
);

Then(
  'no Session is titled {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(sessionRow(page, title)).toHaveCount(0);
  },
);

async function renameSession(
  page: Page,
  title: string,
  renamed: string,
): Promise<void> {
  await sessionRow(page, title).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Rename Session' });
  await dialog.getByLabel('Title', { exact: true }).fill(renamed);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(sessionRow(page, renamed)).toBeVisible();
}

When(
  'I rename the Session {string} to {string} on another page',
  async ({ app }, title: string, renamed: string): Promise<void> => {
    await renameSession(await openWidePage(app), title, renamed);
  },
);

// A reload reads the saved list, so a late Agent title cannot hide behind a list that has not refreshed yet.
When('I reload the App', async ({ page }): Promise<void> => {
  await reloadApp(page);
});

Then(
  "the Sessions list shows {string} and not the Agent's title",
  async ({ page }, title: string): Promise<void> => {
    await expect(sessionRow(page, title)).toBeVisible();
    await expect(sessionRow(page, agentTitle)).toHaveCount(0);
  },
);

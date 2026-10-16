import type { Page } from '@playwright/test';
import { agentTitle } from '@repo/mocks/agent/title-scenarios';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { wide } from './frame';
import { sessionRow, startSession } from './live-session';
import { agentId } from './scenario-agents';

// The scenario itself comes from scenario-agents.ts: the Agent asks an Elicitation, then sends its title.
Given(
  'Agent {int} names its Session after a question',
  async ({ page, server }, ordinal: number): Promise<void> => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      id: agentId(ordinal),
    });
  },
);

When(
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
}

When(
  'I rename the Session {string} to {string} on another page',
  async ({ app }, title: string, renamed: string): Promise<void> => {
    if (!app.openPage) throw new Error('This scenario needs the web App');
    const other = await app.openPage();
    await other.setViewportSize(wide);
    await other.goto('/');
    await renameSession(other, title, renamed);
  },
);

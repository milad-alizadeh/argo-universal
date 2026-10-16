import type { Page } from '@playwright/test';
import { agentTitle } from '@repo/mocks/agent/title-scenarios';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { wide } from './frame';
import { sessionWithStatus, startSession } from './live-session';
import { openSession } from './session-switching';

// The fixture itself comes from scenario-agents.ts: the Agent sends its title before its reply.
Given('Agent 1 names its Session', (): void => {});

When(
  'I start a Session with the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await startSession(page, prompt);
  },
);

// The open Session's header names it; the list names its row by title and status.
async function expectTitled(page: Page, title: string): Promise<void> {
  await expect(sessionWithStatus(page, title, 'Idle')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: title, exact: true }),
  ).toBeVisible();
}

Then(
  "the Session is titled with the Agent's title in the list and its header",
  async ({ page }): Promise<void> => {
    await expectTitled(page, agentTitle);
  },
);

Then(
  'no Session is titled {string}',
  async ({ page }, title: string): Promise<void> => {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${title}, `) }),
    ).toHaveCount(0);
  },
);

// The page opened after the first, in the same browser context.
function otherPage(page: Page): Page {
  const other = page
    .context()
    .pages()
    .find((open) => open !== page);

  if (!other) throw new Error('No other page is open');

  return other;
}

Given(
  'the Session {string} is open on another page',
  async ({ app }, title: string): Promise<void> => {
    if (!app.openPage) throw new Error('This scenario needs the web App');
    const other = await app.openPage();
    await other.setViewportSize(wide);
    await other.goto('/');
    await openSession(other, title);
  },
);

When(
  'I rename the Session {string} to {string}',
  async ({ page }, title: string, renamed: string): Promise<void> => {
    await sessionWithStatus(page, title, 'Idle').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename Session' });
    await dialog.getByLabel('Title', { exact: true }).fill(renamed);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  },
);

Then(
  'the other page shows the Session titled {string}',
  async ({ page }, title: string): Promise<void> => {
    await expectTitled(otherPage(page), title);
  },
);

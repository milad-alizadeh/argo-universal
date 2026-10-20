import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { releaseAgent } from './agent-requests';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';

const updatedGreeting = 'Hello Argo';

const execute = promisify(execFile);

Given(
  'the App follows a {word} system appearance',
  async ({ page }, theme: string) => {
    if (theme !== 'light' && theme !== 'dark')
      throw new Error(`Unknown appearance: ${theme}`);
    await page.emulateMedia({ colorScheme: theme });
  },
);

async function capture(page: Page, name: string): Promise<void> {
  await test
    .info()
    .attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}

Given('the Project has a committed greeting', async ({ app }) => {
  await writeFile(path.join(app.projectPath, 'greeting.txt'), 'Hello world\n');
  await execute('git', ['add', 'greeting.txt'], { cwd: app.projectPath });
  await commitGreeting(app.projectPath);
});

async function commitGreeting(cwd: string): Promise<void> {
  await execute(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-qm',
      'Greeting',
    ],
    { cwd },
  );
}

Given(
  'Agent {int} edits a file and keeps its Turn running',
  async ({ page, server }, ordinal: number) => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      id: expect.any(String),
    });
  },
);

async function expectRunning(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toHaveCount(0);
}

Then(
  /^the changed-files entry shows (\d+) files? while the Turn runs$/,
  async ({ page }, count: string) => {
    await expectRunning(page);
    await capture(page, `changed-files-${count}-before-entry`);
    await expectEntry(page, count);

    await expectRunning(page);
  },
);

async function expectEntry(page: Page, count: string): Promise<void> {
  if (onPhone(page)) return expectPhoneEntry(page, count);

  await expect(
    page.getByRole('button', {
      name: new RegExp(`^Changed files · ${count}(?:,|$)`),
    }),
  ).toBeVisible();
}

async function expectPhoneEntry(page: Page, count: string): Promise<void> {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(
    page.getByRole('menuitem', {
      name: `Changed files · ${count}`,
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, `changed-files-${count}-menu`);
  await page.keyboard.press('Escape');
}

When('the Agent edits the greeting', async ({ app }) => {
  releaseAgent(app.requestLogPath);
});

When('I open the changed files', async ({ page }) => {
  if (onPhone(page)) {
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page
      .getByRole('menuitem', { name: 'Changed files · 1', exact: true })
      .click();
  } else {
    await page
      .getByRole('button', { name: /^Changed files · 1(?:,|$)/ })
      .click();
  }
});

Then(
  'the changed greeting diff opens while the Turn runs',
  async ({ page }) => {
    const diff = greetingDiff(page);

    await expect(diff.getByText('Hello world', { exact: true })).toBeVisible();
    await expect(
      diff.getByText(updatedGreeting, { exact: true }),
    ).toBeVisible();

    await reopenDiff(diff);
    await capture(page, 'changed-files-open-diff');

    if (onPhone(page))
      await page
        .getByRole('button', { name: 'Close Inspector', exact: true })
        .click();

    await expectRunning(page);
  },
);

async function reopenDiff(diff: Locator): Promise<void> {
  const file = diff.getByRole('button', { name: /greeting.txt/ });
  await file.click();
  await expect(diff.getByText(updatedGreeting, { exact: true })).toBeHidden();
  await file.click();
  await expect(diff.getByText(updatedGreeting, { exact: true })).toBeVisible();
}

function greetingDiff(page: Page): Locator {
  return page
    .getByTestId('diff-view')
    .filter({ has: page.getByRole('button', { name: /greeting.txt/ }) });
}

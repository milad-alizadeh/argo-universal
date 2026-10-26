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
  const file = test
    .info()
    .outputPath(`${name}-${test.info().attachments.length}.png`);

  await page.screenshot({ path: file });
  await test.info().attach(name, { path: file, contentType: 'image/png' });
}

Given('the Project has a committed greeting', async ({ app }) => {
  await writeFile(path.join(app.projectPath, 'greeting.txt'), 'Hello world\n');
  await execute('git', ['add', 'greeting.txt'], { cwd: app.projectPath });
  await commitGreeting(app.projectPath);
});

const gitAuthor = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];

async function commitGreeting(cwd: string): Promise<void> {
  await execute('git', [...gitAuthor, 'commit', '-qm', 'Greeting'], { cwd });
  await execute('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd,
  });
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
  async ({ page }, count: number) => {
    await expectRunning(page);
    await capture(page, `changed-files-${count}-before-entry`);
    await expectEntry(page, count);

    await expectRunning(page);
  },
);

async function expectEntry(page: Page, count: number): Promise<void> {
  if (onPhone(page)) return expectPhoneEntry(page, count);

  await expectDesktopEntry(page, count);
}

async function expectDesktopEntry(page: Page, count: number): Promise<void> {
  const workbench = page.getByTestId('session-workbench');

  const changes = workbench.getByRole('button', {
    name: 'Open Changes overview',
  });

  await expect(page.getByTestId('desktop-workbench')).toBeVisible();
  await expect(workbench).toBeAttached();

  if (count === 0) return expect(changes).toHaveCount(0);

  await expect(
    page
      .getByTestId('workbench-changes')
      .getByText(`${count} files`, { exact: true }),
  ).toBeVisible();
}

async function expectPhoneEntry(page: Page, count: number): Promise<void> {
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

When('I open the changed files', async ({ page }) => openChangedFiles(page));

// Files start folded, so the greeting's header opens its diff.
export async function openChangedFiles(page: Page): Promise<void> {
  await (onPhone(page) ? openPhoneSheet(page) : openInspector(page));
  await greetingHeader(page).click();
}

async function openPhoneSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page
    .getByRole('menuitem', { name: 'Changed files · 1', exact: true })
    .click();
}

async function openInspector(page: Page): Promise<void> {
  await page
    .getByTestId('session-workbench')
    .getByRole('button', { name: 'Open Changes overview' })
    .click();
  await expect(page.getByText('0/1 viewed', { exact: true })).toBeVisible();
}

export function greetingHeader(page: Page): Locator {
  return page.getByRole('button', {
    name: 'Diff for greeting.txt',
    exact: true,
  });
}

Then(
  'the changed greeting diff opens while the Turn runs',
  async ({ page }) => {
    const diff = greetingDiff(page);

    await expect(diff.getByText('Hello world', { exact: true })).toBeVisible();
    await expect(
      diff.getByText(updatedGreeting, { exact: true }),
    ).toBeVisible();

    await reopenDiff(page);
    await capture(page, 'changed-files-open-diff');

    if (onPhone(page)) await page.keyboard.press('Escape');

    await expectRunning(page);
  },
);

async function reopenDiff(page: Page): Promise<void> {
  const diff = greetingDiff(page);
  const file = greetingHeader(page);

  await file.click();
  await expect(diff.getByText(updatedGreeting, { exact: true })).toBeHidden();
  await file.click();
  await expect(diff.getByText(updatedGreeting, { exact: true })).toBeInViewport(
    { ratio: 1 },
  );
}

// The Changes list holds the one changed file, its header and its diff lines.
function greetingDiff(page: Page): Locator {
  return page.getByTestId('changes-files');
}

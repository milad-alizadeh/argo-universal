import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { releaseAgent } from './agent-requests';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';
import { chooseLocalCheckout, sendPrompt } from './new-session';

Given(
  'Agent {int} starts a Shell when released',
  async ({ page, server }, ordinal: number) => {
    await readAgent(page, server.httpUrl, ordinal);
  },
);

function shellEntry(page: Page): Locator {
  return onPhone(page)
    ? page.getByRole('button', { name: /^Shells:/ })
    : page.getByRole('button', { name: 'Open Shells overview', exact: true });
}

const shellOutput = (page: Page): Locator =>
  page.getByLabel(/Shell ready.* output$/);

Then('the Session offers no Shells', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeVisible();
  await expect(shellEntry(page)).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /^Shells/ })).toHaveCount(0);
});

When('the Agent starts its Shell', async ({ app }) => {
  releaseAgent(app.requestLogPath);
});

Then('the Session offers 1 Shell', async ({ page }) => {
  await expect(shellEntry(page)).toBeVisible();

  await (onPhone(page)
    ? expect(shellEntry(page)).toHaveAccessibleName('Shells: 1')
    : expect(shellEntry(page)).toContainText('1 shell'));
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeVisible();
});

Given('a Session waiting for its first Shell', async ({ page }) => {
  await startShellSession(page);
});

async function startShellSession(page: Page): Promise<void> {
  await chooseLocalCheckout(page);
  await sendPrompt(page, 'Start a background Shell');
}

Given('a running Shell with its output open', async ({ page, app }) => {
  await startShellSession(page);
  releaseAgent(app.requestLogPath);
  await openRunningShell(page);
  await expect(
    shellOutput(page).getByText('Shell ready', { exact: true }),
  ).toBeVisible();
  await expect(
    shellOutput(page).getByText('Shell updated', { exact: true }),
  ).toHaveCount(0);
});

async function openRunningShell(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeVisible();
  await shellEntry(page).click();
  const shell = page.getByRole('button', { name: /Shell ready/ });

  await expect(shell).toBeVisible();
  await shell.click();
}

Then('the Shell output shows {string}', async ({ page }, text: string) => {
  await expect(
    shellOutput(page).getByText(text, { exact: true }),
  ).toBeVisible();
});

When('the Shell prints more output', async ({ app }) => {
  await writeFile(path.join(app.projectPath, 'shell-output.release'), '');
});

When('I stop the Shell', async ({ page }) => {
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
});

Then('the Shell output shows its stopped outcome', async ({ page }) => {
  await expect(
    shellOutput(page).getByText('Stopped', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toHaveCount(0);
  await expect(
    shellOutput(page).getByText('Shell ready', { exact: true }),
  ).toBeVisible();
});

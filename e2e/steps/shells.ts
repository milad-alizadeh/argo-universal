import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
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

// The Shell opens from the Workbench sheet on phones and from its card on wide windows.
function shellEntry(page: Page): Locator {
  return onPhone(page)
    ? page
        .getByRole('dialog', { name: 'Workbench' })
        .getByRole('link', { name: /Shell ready/ })
    : page
        .getByTestId('workbench-shells')
        .getByRole('button', { name: /^Open / });
}

async function openWorkbenchSheet(page: Page): Promise<void> {
  if (onPhone(page))
    await page.getByRole('button', { name: 'Workbench', exact: true }).click();
}

async function closeWorkbenchSheet(page: Page): Promise<void> {
  if (onPhone(page)) await page.keyboard.press('Escape');
}

const shellOutput = (page: Page): Locator =>
  page.getByLabel(/Shell ready.* output$/);

async function captureShell(page: Page, name: string): Promise<void> {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

Then('the Session offers no Shells', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeVisible();
  await openWorkbenchSheet(page);
  await expect(shellEntry(page)).toHaveCount(0);
  await closeWorkbenchSheet(page);
  await expect(
    page.getByRole('tab', { name: /^Background Tasks/ }),
  ).toHaveCount(0);
});

When('the Agent starts its Shell', async ({ app }) => {
  releaseAgent(app.requestLogPath);
});

Then('the Session offers 1 Shell', async ({ page }) => {
  await openWorkbenchSheet(page);
  await expect(shellEntry(page)).toBeVisible();

  await expect(shellEntry(page)).toHaveCount(1);
  await closeWorkbenchSheet(page);
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

export async function openRunningShell(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeVisible();
  await openWorkbenchSheet(page);
  await shellEntry(page).click();
}

Then('the Shell output shows {string}', async ({ page }, text: string) => {
  await expect(
    shellOutput(page).getByText(text, { exact: true }),
  ).toBeVisible();
  await captureShell(page, text.replaceAll(' ', '-').toLowerCase());
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
  await captureShell(page, 'shell-stopped');
});

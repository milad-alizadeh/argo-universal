import { rm } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { placeTool } from '../server-tools';
import { browseAgents } from './agent-catalog';
import { Given, When, Then, test } from './fixtures';
import { agentWork } from './timeouts';
import { toast } from './toasts';

const removeTools = async (
  toolsPath: string,
  files: readonly string[],
): Promise<void> => {
  for (const file of files) await rm(path.join(toolsPath, file));
};

// Evidence for the PR: each state of the flow, as the user sees it.
const capture = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    animations: 'disabled',
  });
};

const installButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Install', exact: true });

const homebrewButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Install Node.js with Homebrew' });

Given(
  'Node.js is not on the Server, but Homebrew is',
  async ({ app }): Promise<void> => {
    await removeTools(app.toolsPath, ['node', 'npm']);
    await placeTool(app.toolsPath, 'brew');
  },
);

Given(
  'uv is not on the Server, nor Homebrew',
  async ({ app }): Promise<void> => {
    await removeTools(app.toolsPath, ['uv']);
  },
);

When('I open {word} Agent', async ({ page }, name: string): Promise<void> => {
  await browseAgents(page);
  await page.getByRole('link', { name: new RegExp(`^${name} Agent,`) }).click();
});

Then(
  'Example Agent needs Node.js and offers it from Homebrew instead of Install',
  async ({ page }): Promise<void> => {
    await expect(homebrewButton(page)).toBeVisible(agentWork);
    await expect(page.getByText('Node.js not found')).toBeVisible();
    await expect(installButton(page)).toHaveCount(0);
    await capture(page, 'needs-node-with-homebrew');
  },
);

When(
  'I install Node.js with Homebrew after reading its command',
  async ({ page }): Promise<void> => {
    await homebrewButton(page).click();
    const alert = page.getByRole('dialog', { name: 'Install Node.js?' });
    await expect(
      alert.getByText('brew install node', { exact: true }),
    ).toBeVisible();
    await capture(page, 'homebrew-alert');
    await alert.getByRole('button', { name: 'Install', exact: true }).click();
  },
);

Then(
  'one toast says Node.js is installed and Example Agent offers Install',
  async ({ page }): Promise<void> => {
    await expect(toast(page, 'Node.js installed')).toBeVisible(agentWork);
    await expect(toast(page, 'Node.js installed')).toHaveCount(1);
    await expect(installButton(page)).toBeVisible();
    await expect(page.getByText('Node.js not found')).toHaveCount(0);
    await capture(page, 'node-installed');
  },
);

Then(
  'Example Agent shows Node.js installing in place',
  async ({ page }): Promise<void> => {
    await expect(page.getByText('Installing Node.js…')).toBeVisible();
    await expect(homebrewButton(page)).toHaveCount(0);
    await expect(installButton(page)).toHaveCount(0);
  },
);

Then(
  'one toast says Node.js could not be installed and Example Agent still offers Homebrew',
  async ({ page }): Promise<void> => {
    const failed = toast(page, 'Could not install Node.js');

    await expect(failed).toBeVisible(agentWork);
    await expect(failed).toHaveCount(1);
    await expect(homebrewButton(page)).toBeVisible();
    await expect(installButton(page)).toHaveCount(0);
    await capture(page, 'homebrew-failed');
  },
);

Then(
  'Python Agent needs uv and links its download and Homebrew instead of Install',
  async ({ page }): Promise<void> => {
    await expect(page.getByRole('link', { name: 'Download uv' })).toBeVisible(
      agentWork,
    );
    await expect(
      page.getByRole('link', { name: 'Get Homebrew' }),
    ).toHaveAttribute('href', 'https://brew.sh');
    await expect(
      page.getByRole('button', { name: /with Homebrew$/ }),
    ).toHaveCount(0);
    await expect(installButton(page)).toHaveCount(0);
    await capture(page, 'needs-uv-without-homebrew');
  },
);

When('uv is installed outside Argo', async ({ app }): Promise<void> => {
  await placeTool(app.toolsPath, 'uv');
});

Then('Python Agent offers Install', async ({ page }): Promise<void> => {
  await expect(installButton(page)).toBeVisible(agentWork);
  await expect(page.getByRole('link', { name: 'Download uv' })).toHaveCount(0);
});

When('I recheck the tools', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Recheck' }).click();
});

// The page reports itself hidden, then visible, as when the App goes to the background and returns; the e2e project has no DOM lib.
const reportVisibility = (visibility: 'hidden' | 'visible'): string => `
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => '${visibility}' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => ${visibility === 'hidden'} });
  document.dispatchEvent(new Event('visibilitychange'));
`;

When(
  'the App goes to the background and comes back',
  async ({ page }): Promise<void> => {
    await page.evaluate(reportVisibility('hidden'));
    await page.evaluate(reportVisibility('visible'));
  },
);

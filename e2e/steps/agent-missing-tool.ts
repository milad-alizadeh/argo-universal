import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { Given, When, Then, test } from './fixtures';
import { agentWork } from './timeouts';
import { toast } from './toasts';

const stub = '#!/bin/sh\nexit 0\n';
const placeTool = async (toolsPath: string, file: string): Promise<void> => {
  await writeFile(path.join(toolsPath, file), stub, { mode: 0o755 });
};
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
  'Python Agent needs uv and links its download page instead of Install',
  async ({ page }): Promise<void> => {
    await expect(page.getByRole('link', { name: 'Download uv' })).toBeVisible(
      agentWork,
    );
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

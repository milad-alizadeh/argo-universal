import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { placeNode, placeTool } from '../server-tools';
import { browseAgents } from './agent-catalog';
import { Given, When, Then, test } from './fixtures';
import { agentWork } from './timeouts';

// Unlinks the tool's own entry in the test's tools folder; a link to the real Node.js is removed, never followed.
const removeTools = async (
  toolsPath: string,
  files: readonly string[],
): Promise<void> => {
  for (const file of files) await unlink(path.join(toolsPath, file));
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

Given('Node.js is not on the Server', async ({ app }): Promise<void> => {
  await removeTools(app.toolsPath, ['node', 'npm']);
});

Given('uv is not on the Server', async ({ app }): Promise<void> => {
  await removeTools(app.toolsPath, ['uv']);
});

When('I open {word} Agent', async ({ page }, name: string): Promise<void> => {
  await browseAgents(page);
  await page.getByRole('link', { name: new RegExp(`^${name} Agent,`) }).click();
});

const expectMissing = async (
  page: Page,
  tool: { name: string; runner: string },
): Promise<void> => {
  await expect(page.getByText(`${tool.name} not found`)).toBeVisible(agentWork);
  await expect(
    page.getByText(`${tool.runner} isn’t on this Mac.`),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Recheck' })).toBeVisible();
  await expect(page.getByText(/Homebrew|Download/)).toHaveCount(0);
  await expect(installButton(page)).toHaveCount(0);
};

Then(
  'Example Agent needs Node.js because npx is missing, instead of Install',
  async ({ page }): Promise<void> => {
    await expectMissing(page, { name: 'Node.js', runner: 'npx' });
    await capture(page, 'needs-node');
  },
);

Then(
  'Python Agent needs uv because uvx is missing, instead of Install',
  async ({ page }): Promise<void> => {
    await expectMissing(page, { name: 'uv', runner: 'uvx' });
    await capture(page, 'needs-uv');
  },
);

When('Node.js is installed outside Argo', async ({ app }): Promise<void> => {
  await placeNode(app.toolsPath);
});

When('uv is installed outside Argo', async ({ app }): Promise<void> => {
  await placeTool(app.toolsPath, 'uv');
});

Then('the Agent offers Install', async ({ page }): Promise<void> => {
  await expect(installButton(page)).toBeVisible(agentWork);
  await expect(page.getByText(/ not found$/)).toHaveCount(0);
});

When('I recheck the tools', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: 'Recheck' }).click();
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

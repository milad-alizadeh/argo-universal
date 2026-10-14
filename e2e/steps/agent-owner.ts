import { mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { type AppOptions, expect } from '../fixtures';
import {
  entrypoint,
  pathAgentName,
  publishPathAgent,
  writePathAgent,
} from './agent-resolver';
import { Given, Then, When, test } from './fixtures';
import { agentWork } from './timeouts';

const updateTitle = `Update ${pathAgentName} yourself`;

const cellarBin = (machinePath: string, version: string): string =>
  path.join(path.dirname(machinePath), 'Cellar', entrypoint, version, 'bin');

// As `brew install` leaves it: the file in a Cellar beside the test's PATH folder, linked onto PATH.
const installFormula = async (
  machinePath: string,
  version: string,
): Promise<void> => {
  const cellar = cellarBin(machinePath, version);

  await mkdir(cellar, { recursive: true });
  await writePathAgent(path.join(cellar, entrypoint));
  await symlink(
    path.join(cellar, entrypoint),
    path.join(machinePath, entrypoint),
  );
};

// Older than the catalog's 1.2.3, so the copy shows Update available.
Given(
  'Path Agent {word} was installed with Homebrew',
  async ({ app }, version: string): Promise<void> => {
    await installFormula(app.machinePath, version);
    await publishPathAgent(app.registryPath);
  },
);

const visible = (locator: Locator): Locator =>
  locator.filter({ visible: true });

Then(
  'Path Agent is installed with Homebrew and offers Disable instead of Remove',
  async ({ page }): Promise<void> => {
    await expect(
      visible(page.getByText('Installed with Homebrew', { exact: true })),
    ).toBeVisible(agentWork);
    await expect(
      page.getByRole('button', { name: `Disable ${pathAgentName}` }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
    await capture(page, 'installed-with-homebrew');
  },
);

When('I ask to update Path Agent', async ({ page }): Promise<void> => {
  await visible(page.getByRole('button', { name: 'Update', exact: true }))
    .first()
    .click();
});

// Read in the page; the e2e project has no DOM lib.
const clipboardText = 'navigator.clipboard.readText()';

// Chromium reads the clipboard only once allowed; Electron allows it already.
const readClipboard = async (
  page: Page,
  appTarget: AppOptions['appTarget'],
): Promise<string> => {
  if (appTarget === 'web')
    await page.context().grantPermissions(['clipboard-read']);

  return page.evaluate<string>(clipboardText);
};

// The story proves no install or update starts; this proves the user gets the command.
Then(
  'Argo shows the Homebrew command to run myself',
  async ({ page, appTarget }): Promise<void> => {
    const alert = page.getByRole('dialog', { name: updateTitle });
    await expect(
      alert.getByText(`brew upgrade ${entrypoint}`, { exact: true }),
    ).toBeVisible();
    await capture(page, 'update-it-yourself');
    await alert.getByRole('button', { name: 'Copy command' }).click();
    await expect(alert).toHaveCount(0);
    await expect
      .poll(() => readClipboard(page, appTarget))
      .toBe(`brew upgrade ${entrypoint}`);
  },
);

// Evidence for the PR: each state, as the user sees it.
const capture = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    animations: 'disabled',
  });
};

import { rename, writeFile } from 'node:fs/promises';
import type { Page, Locator } from '@playwright/test';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { When, Then, test } from './fixtures';
import { agentWork } from './timeouts';
import { toast } from './toasts';

const versionRow = (page: Page, line: string | RegExp): Locator =>
  page.getByRole('group', {
    name: typeof line === 'string' ? `Version, ${line}` : line,
    exact: typeof line === 'string',
  });

// Update available reads from → to; once Ready the row names the installed Adapter.
const offered = 'v1.2.3 → v2.0.0';

const updatedRegistry: typeof publishedRegistry = {
  ...publishedRegistry,
  agents: publishedRegistry.agents.map((agent) =>
    agent.id === 'example-agent'
      ? {
          ...agent,
          version: '2.0.0',
          distribution: {
            npx: { package: 'example-agent@2.0.0', args: ['--acp'] },
          },
        }
      : agent,
  ),
};

When(
  'the registry offers Example Agent version two',
  async ({ page, app }): Promise<void> => {
    await writeFile(
      `${app.registryPath}.next`,
      JSON.stringify(updatedRegistry),
    );
    await rename(`${app.registryPath}.next`, app.registryPath);
    await page.goBack();
    await page.goBack();
    await page.getByRole('link', { name: /^Agents(?:,|$)/ }).click();
    await page.getByRole('link', { name: /^Example Agent,/ }).click();
    await expect(
      page.getByRole('button', { name: 'Update', exact: true }),
    ).toBeVisible();
  },
);

Then(
  'Example Agent still shows selected version one',
  async ({ page }): Promise<void> => {
    await expect(versionRow(page, offered)).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('agent-update-available.png'),
      animations: 'disabled',
    });
  },
);

When(
  'I explicitly update Example Agent with installer {word}',
  async ({ page, app }, outcome: string): Promise<void> => {
    await writeFile(
      app.installationPath,
      JSON.stringify({ outcome, released: true, version: '2.0.0' }),
    );
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Update Example Agent?' });
    await expect(dialog).toContainText('2.0.0');
    await page.screenshot({
      path: test.info().outputPath('agent-update-confirmation.png'),
      animations: 'disabled',
    });
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
  },
);

Then(
  'Example Agent settles with selected version {word}',
  async ({ page }, version: string): Promise<void> => {
    const expected = version === 'two' ? updated : retained;
    await expect(toast(page, expected.title)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // The installed Adapter version is read by the readiness check that follows the update.
    await expect(versionRow(page, expected.version)).toBeVisible(agentWork);
  },
);

const updated = {
  title: 'Example Agent updated',
  version: /^Version, Adapter 2\.0\.0(?: · |$)/,
};

const retained = { title: 'Could not update Example Agent', version: offered };

import { writeFile } from 'node:fs/promises';
import type { Page, Locator } from '@playwright/test';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { When, Then, test } from './fixtures';
const versionRow = (page: Page, version: string): Locator =>
  page.getByRole('group', { name: `Version, v${version}`, exact: true });

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
    await writeFile(app.registryPath, JSON.stringify(updatedRegistry));
    await page.goBack();
    await page.getByRole('link', { name: /^Example Agent,/ }).click();
    await expect(
      page.getByRole('button', { name: 'Update', exact: true }),
    ).toBeVisible();
  },
);
Then(
  'Example Agent still shows selected version one',
  async ({ page }): Promise<void> => {
    await expect(versionRow(page, '1.2.3')).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('agent-update-available.png'),
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
    });
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
  },
);
Then(
  'Example Agent settles with selected version {word}',
  async ({ page }, version: string): Promise<void> => {
    const expected = version === 'two' ? updated : retained;
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(expected.title);
    await dialog
      .getByRole('button', {
        name: expected.action,
        exact: true,
      })
      .click();
    await expect(versionRow(page, expected.version)).toBeVisible();
  },
);
const updated = {
  title: 'Example Agent updated',
  action: 'Done',
  version: '2.0.0',
};
const retained = {
  title: 'Installation failed',
  action: 'Close',
  version: '1.2.3',
};

import { rename, writeFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { When, Then } from './fixtures';
import { mutate } from './server-query';

const versionThree: typeof publishedRegistry = {
  ...publishedRegistry,
  agents: publishedRegistry.agents.map((entry) =>
    entry.id === 'example-agent'
      ? {
          ...entry,
          version: '3.0.0',
          distribution: {
            npx: { package: 'example-agent@3.0.0', args: ['--acp'] },
          },
        }
      : entry,
  ),
};

const updating = (page: Page): Locator =>
  page.getByRole('button', { name: 'Updating…', exact: true });

async function installer(path: string, released: boolean): Promise<void> {
  await writeFile(
    `${path}.next`,
    JSON.stringify({ outcome: 'success', released, version: '2.0.0' }),
  );
  await rename(`${path}.next`, path);
}

When(
  'I explicitly update Example Agent while its installer is held',
  async ({ page, app }): Promise<void> => {
    await installer(app.installationPath, false);
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Update', exact: true })
      .click();
    await expect(updating(page)).toBeDisabled();
  },
);

When(
  'another App refreshes the catalog to version three',
  async ({ page, app }): Promise<void> => {
    await writeFile(`${app.registryPath}.next`, JSON.stringify(versionThree));
    await rename(`${app.registryPath}.next`, app.registryPath);
    await mutate({
      page,
      httpUrl: app.httpUrl,
      procedure: 'agents.syncCatalog',
      input: {},
    });
  },
);

Then('the update stays in progress', async ({ page }): Promise<void> => {
  await expect(updating(page)).toBeDisabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

When(
  /^the App (stays|reloads) during the accepted update$/,
  async ({ page }, recovery: string): Promise<void> => {
    if (recovery === 'stays') return;
    await page.goto('/');
    await browseAgents(page);
    await page.getByRole('link', { name: /^Example Agent,/ }).click();
  },
);

When('the version two installer completes', async ({ app }): Promise<void> => {
  await installer(app.installationPath, true);
});

Then(
  'Example Agent offers the next explicit update',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Update Example Agent?' });
    await expect(dialog).toContainText('Version 3.0.0');
    await expect(
      dialog.getByRole('button', { name: 'Update', exact: true }),
    ).toBeEnabled();
  },
);

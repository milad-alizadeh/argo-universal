import { writeFile } from 'node:fs/promises';
import {
  malformedRegistry,
  offlineRegistry,
} from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';

const exampleAgentName = 'Example Agent';

When('I browse available Agents', async ({ page }): Promise<void> => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 600)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Agents', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: exampleAgentName, exact: true }),
  ).toBeVisible();
});

Then(
  'the catalog shows upstream Agent metadata',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByText('example-agent', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('A compatible coding Agent').first(),
    ).toBeVisible();
    await expect(page.getByText('Version 1.2.3').first()).toBeVisible();
    await expect(page.getByLabel(`${exampleAgentName} icon`)).toBeVisible();
    await expect(
      page.getByText('npm package · requires Node.js and npm').first(),
    ).toBeVisible();
    await expect(page.getByText(/No distribution for/)).toBeVisible();
  },
);

When(
  'I search the catalog for {string}',
  async ({ page }, search: string): Promise<void> => {
    await page.getByRole('textbox', { name: 'Search Agents' }).fill(search);
  },
);

Then(
  'only Python Agent is shown in the catalog',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Python Agent', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: exampleAgentName, exact: true }),
    ).toHaveCount(0);
  },
);

When(
  'the registry becomes {word}',
  async ({ app }, failure: string): Promise<void> => {
    await writeFile(
      app.registryPath,
      JSON.stringify(
        failure === 'offline' ? offlineRegistry : malformedRegistry,
      ),
    );
  },
);

When('I refresh the Agent catalog', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Refresh catalog' }).click();
});

Then(
  'the catalog keeps the last-good Agents with an explicit error',
  async ({ page }): Promise<void> => {
    await expect(page.getByRole('alert')).toContainText(
      'Showing the last good catalog',
    );
    await expect(page.getByRole('alert')).toContainText(/offline|malformed/);
    await expect(
      page.getByRole('heading', { name: exampleAgentName, exact: true }),
    ).toBeVisible();
  },
);

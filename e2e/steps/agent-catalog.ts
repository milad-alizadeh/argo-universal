import { writeFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import {
  malformedRegistry,
  offlineRegistry,
} from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';

const exampleAgentName = 'Example Agent';
const exampleMetadata = [
  'A compatible coding Agent',
  'v1.2.3 · npm · needs Node.js',
];

async function expectExampleMetadata(row: Locator): Promise<void> {
  for (const text of exampleMetadata)
    await expect(row.getByText(text, { exact: true })).toBeVisible();
  await expect(
    row.getByLabel(`${exampleAgentName} icon`, { exact: true }),
  ).toBeVisible();
}

async function readDisplayedServerPlatform(page: Page): Promise<string> {
  const text = await page.getByText(/^For this Server · /).textContent();
  if (!text) throw new Error('The catalog must show the Server platform');
  return text.replace('For this Server · ', '');
}

async function expectWindowsRecipe(page: Page): Promise<void> {
  const platform = await readDisplayedServerPlatform(page);
  const recipe =
    platform === 'windows-x86_64'
      ? 'Binary'
      : `No distribution for ${platform}`;
  const windows = page.getByRole('listitem', {
    name: 'Windows Agent',
    exact: true,
  });
  await expect(
    windows.getByText(`v1.2.3 · ${recipe}`, { exact: true }),
  ).toBeVisible();
}

export async function browseAgents(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 600)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /^Agents(?:,|$)/ }).click();
  await expect(
    page.getByRole('heading', { name: exampleAgentName, exact: true }),
  ).toBeVisible();
}

When('I browse available Agents', async ({ page }): Promise<void> => {
  await browseAgents(page);
});

Then(
  'the catalog shows upstream Agent metadata',
  async ({ page }): Promise<void> => {
    const example = page.getByRole('listitem', {
      name: exampleAgentName,
      exact: true,
    });
    await expectExampleMetadata(example);
    await expectWindowsRecipe(page);
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
      'showing saved catalog',
    );
    await expect(page.getByRole('alert')).toContainText(/offline|malformed/);
    await expect(
      page.getByRole('heading', { name: exampleAgentName, exact: true }),
    ).toBeVisible();
  },
);

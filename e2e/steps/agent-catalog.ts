import { writeFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import {
  malformedRegistry,
  offlineRegistry,
} from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';

const exampleAgentName = 'Example Agent';
const exampleDescription = 'A compatible coding Agent';

// Rows are links named "<name>, <description>, <status>".
const agentLink = (page: Page, name: string): Locator =>
  page.getByRole('link', { name: new RegExp(`^${name},`) });

// The registry platform the Server resolves, such as "darwin-aarch64".
function serverPlatform(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
  return `${os}-${arch}`;
}

const aboutRow = (page: Page, name: string): Locator =>
  page.getByRole('group', { name, exact: true });

// Opens an Agent's page, reads its version and distribution, and comes back.
async function expectAbout(
  page: Page,
  name: string,
  distribution: string,
): Promise<void> {
  await agentLink(page, name).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(aboutRow(page, 'Version, v1.2.3')).toBeVisible();
  await expect(aboutRow(page, `Distribution, ${distribution}`)).toBeVisible();
  await page.goBack();
}

const windowsDistribution = (): string => {
  const platform = serverPlatform();
  return platform === 'windows-x86_64'
    ? 'Binary'
    : `No distribution for ${platform}`;
};

export async function browseAgents(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 600)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /^Agents(?:,|$)/ }).click();
  await expect(agentLink(page, exampleAgentName)).toBeVisible();
}

When('I browse available Agents', async ({ page }): Promise<void> => {
  await browseAgents(page);
});

Then(
  'the catalog shows upstream Agent metadata',
  async ({ page }): Promise<void> => {
    await expect(
      agentLink(page, exampleAgentName).getByText(exampleDescription, {
        exact: true,
      }),
    ).toBeVisible();
    await expectAbout(page, exampleAgentName, 'npm · needs Node.js');
    await expectAbout(page, 'Windows Agent', windowsDistribution());
  },
);

When(
  'I search the catalog for {string}',
  async ({ page }, search: string): Promise<void> => {
    await page.getByRole('button', { name: 'Search Agents' }).click();
    await page.getByRole('textbox', { name: 'Search Agents' }).fill(search);
  },
);

Then(
  'only Python Agent is shown in the catalog',
  async ({ page }): Promise<void> => {
    await expect(agentLink(page, 'Python Agent')).toBeVisible();
    await expect(agentLink(page, exampleAgentName)).toHaveCount(0);
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

// Opening the Agents page again syncs the catalog with the registry.
When('I open the Agents page again', async ({ page }): Promise<void> => {
  await page.goBack();
  await page.getByRole('link', { name: /^Agents(?:,|$)/ }).click();
});

Then(
  'the catalog keeps the last-good Agents with an explicit error',
  async ({ page }): Promise<void> => {
    const toasts = page.getByRole('region', { name: /^Notifications/ });
    await expect(toasts).toContainText('showing saved catalog');
    await expect(toasts).toContainText(/offline|malformed/);
    await expect(agentLink(page, exampleAgentName)).toBeVisible();
  },
);

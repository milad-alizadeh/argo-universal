import { writeFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import {
  malformedRegistry,
  offlineRegistry,
  publishedRegistry,
} from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone } from './frame';

const exampleAgentName = 'Example Agent';

const exampleDescription = 'A compatible coding Agent';

// Rows are links named "<name>, <description>, <status>".
const agentLink = (page: Page, name: string): Locator =>
  page.getByRole('link', { name: new RegExp(`^${name},`) });

const aboutRow = (page: Page, name: string | RegExp): Locator =>
  page.getByRole('group', { name, exact: true });

// A Settings list row, such as Agents.
const settingsLink = (page: Page, name: string): Locator =>
  page.getByRole('link', { name: new RegExp(`^${name}(?:,|$)`) });

// Back to the Agents list: a phone goes back to it; a wide Frame swapped it for the Agent's page, so its Settings row opens it again.
async function returnToAgents(page: Page): Promise<void> {
  await (onPhone(page) ? page.goBack() : settingsLink(page, 'Agents').click());
}

// Opens an Agent's page, reads its version and distribution, and comes back.
async function expectAbout(
  page: Page,
  name: string,
  distribution: string | RegExp,
): Promise<void> {
  await agentLink(page, name).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(aboutRow(page, 'Version, v1.2.3')).toBeVisible();
  await expect(aboutRow(page, distributionRow(distribution))).toBeVisible();
  await returnToAgents(page);
}

const distributionRow = (distribution: string | RegExp): string | RegExp =>
  typeof distribution === 'string'
    ? `Distribution, ${distribution}`
    : new RegExp(`^Distribution, ${distribution.source}$`, 'u');

// The registry offers a Windows binary only, so the Server names its own platform when it has none.
const windowsDistribution = /(?:Binary|No distribution for \S+)/u;

export async function browseAgents(page: Page): Promise<void> {
  if (onPhone(page))
    await page.getByRole('button', { name: 'Show navigation menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await settingsLink(page, 'Agents').click();
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
    await expectAbout(page, 'Windows Agent', windowsDistribution);
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

// Leaving the Agents page: a phone goes back to the Settings list; a wide Frame keeps that list beside it and opens another of its pages.
async function leaveAgents(page: Page): Promise<void> {
  await (onPhone(page)
    ? page.goBack()
    : settingsLink(page, 'Accounts').click());
}

// Opening the Agents page again syncs the catalog with the registry.
async function openAgentsAgain(page: Page): Promise<void> {
  await leaveAgents(page);
  await settingsLink(page, 'Agents').click();
}

When('I open the Agents page again', async ({ page }): Promise<void> => {
  await openAgentsAgain(page);
});

// From an Agent's page, the Agents page opened anew: a phone first goes back to it.
export async function reopenAgentsFromAgent(page: Page): Promise<void> {
  if (onPhone(page)) await page.goBack();
  await openAgentsAgain(page);
}

Then(
  'the catalog keeps the last-good Agents with an explicit error',
  async ({ page }): Promise<void> => {
    const toasts = page.getByRole('region', { name: /^Notifications/ });
    await expect(toasts).toContainText('showing saved catalog');
    await expect(toasts).toContainText(/offline|malformed/);
    await expect(agentLink(page, exampleAgentName)).toBeVisible();
  },
);

When(
  'the registry publishes {string}',
  async ({ app }, name: string): Promise<void> => {
    const [first] = publishedRegistry.agents;
    const added = { ...first, id: 'late-agent', name };
    await writeFile(
      app.registryPath,
      JSON.stringify({
        ...publishedRegistry,
        agents: [...publishedRegistry.agents, added],
      }),
    );
  },
);

// The browser tells the page it is visible again, as when the person returns to the window.
When('the window regains focus', async ({ page }): Promise<void> => {
  await page.locator('body').dispatchEvent('visibilitychange');
});

Then(
  'the catalog lists {string}',
  async ({ page }, name: string): Promise<void> => {
    await expect(agentLink(page, name)).toBeVisible();
  },
);

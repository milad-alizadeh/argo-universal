import { writeFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { offlineRegistry } from '@repo/mocks/registry/catalog';
import { scriptedRegistry } from '@repo/mocks/registry/scripted';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';

const exampleName = 'Example Agent';

/*
 * The row's press is an empty labelled layer, so the card is the row around it: its buttons and links sit beside the
 * layer, not inside it, and each stays its own accessibility element.
 */
export const agentCard = (page: Page, name: string): Locator =>
  page
    .getByRole('group', { name: new RegExp(`^${name}, v`) })
    .locator('xpath=..');

const settingsLink = (page: Page, name: string): Locator =>
  page.getByRole('link', { name: new RegExp(`^${name}(?:,|$)`) });

export async function browseAgents(page: Page): Promise<void> {
  if (onPhone(page))
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await settingsLink(page, 'Agents').click();
  await expect(page).toHaveURL(/\/settings\/agents$/);
}

When('I browse available Agents', async ({ page }) => browseAgents(page));

Then(
  'the Registry cards show names, versions and descriptions',
  async ({ page }) => {
    await expect(agentCard(page, exampleName)).toBeVisible();
    await expect(agentCard(page, exampleName)).toContainText(
      'A compatible coding Agent',
    );
    await expect(agentCard(page, exampleName)).toContainText('v1.2.3');
  },
);

Then('Python Agent is unavailable on this platform', async ({ page }) => {
  const card = agentCard(page, 'Python Agent');
  await expect(
    card.getByRole('button', {
      name: /^(Install|Remove) Python Agent$/,
    }),
  ).toHaveCount(0);
  await expect(unsupportedNote(page, card)).toBeVisible();
});

// A phone labels its status icon; a wide window writes the note on the meta line.
const unsupportedNote = (page: Page, card: Locator): Locator =>
  onPhone(page)
    ? card.getByLabel(unsupported, { exact: true })
    : card.getByText(unsupported, { exact: true });

const unsupported = 'Not supported on this platform';

When('I search the catalog for {string}', async ({ page }, search: string) => {
  const options = { name: 'Search Agents' };

  await page.getByRole('button', options).click();
  await page.getByRole('textbox', options).fill(search);
});

Then('only Python Agent is shown in the catalog', async ({ page }) => {
  await expect(agentCard(page, 'Python Agent')).toBeVisible();
  await expect(agentCard(page, exampleName)).toHaveCount(0);
});

When('the registry becomes offline', async ({ app }) => {
  await writeFile(app.registryPath, JSON.stringify(offlineRegistry));
});

When('I open the Agents page again', async ({ page }) => {
  await (onPhone(page)
    ? page.goBack()
    : settingsLink(page, 'Accounts').click());
  await settingsLink(page, 'Agents').click();
});

Then(
  'the catalog keeps the last-good Agents without an error',
  async ({ page }) => {
    await expect(agentCard(page, exampleName)).toBeVisible();
    await expect(
      page.getByText(/Failed to load the Agent Registry/),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Retry', exact: true }),
    ).toHaveCount(0);
  },
);

Given('the Registry has never been stored and is offline', async ({ app }) => {
  await writeFile(app.registryPath, JSON.stringify(offlineRegistry));
});

Then('the Registry shows its friendly error and Retry', async ({ page }) => {
  await expect(
    page.getByText(
      'Failed to load the Agent Registry. Please check your connection and try again.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry', exact: true }),
  ).toBeVisible();
});

When('the Registry connection returns and I retry', async ({ app, page }) => {
  await writeFile(app.registryPath, JSON.stringify(scriptedRegistry()));
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
});

import { rename, writeFile } from 'node:fs/promises';
import { expect } from '../fixtures';
import { readAgents } from './agents';
import { Given, When, Then } from './fixtures';
import { openConfiguration, waitForEmptySession } from './new-session';

const optionsLabel = 'Agent and model';

const selectAgentLabel = /^Agent(?:,|$)/;

async function writeInstallation(
  path: string,
  released: boolean,
): Promise<void> {
  const next = `${path}.next`;

  await writeFile(next, JSON.stringify({ outcome: 'success', released }));
  await rename(next, path);
}

Given('no Agents are installed', async ({ page, server }) => {
  expect(await readAgents(page, server.httpUrl)).toEqual([]);
});

Then(
  'the Agent picker offers only Add Agents and Send is disabled',
  async ({ page }) => {
    await checkZeroAgentComposer(page);
    await openConfiguration(page);
    await page
      .getByRole('button', { name: selectAgentLabel, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Add Agents', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('radio', { name: 'Claude', exact: true }),
    ).toHaveCount(0);
    await closeAgentPicker(page);
  },
);

async function checkZeroAgentComposer(
  page: Parameters<typeof readAgents>[0],
): Promise<void> {
  await expect(page.getByRole('button', { name: optionsLabel })).toContainText(
    'Choose Agent',
  );
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeDisabled();
}

When('I type {string} and open Add Agents', async ({ page }, text: string) => {
  await page.getByRole('textbox', { name: 'Message' }).fill(text);
  await openConfiguration(page);
  await page
    .getByRole('button', { name: selectAgentLabel, exact: true })
    .click();
  await page.getByRole('button', { name: 'Add Agents', exact: true }).click();
});

Then('the Agents page is open', async ({ page }) => {
  // Opened over New Session on a phone, the page carries it to return to.
  await expect(page).toHaveURL(/\/settings\/agents(\?returnTo=[^&]+)?$/);
  await expect(
    page.getByRole('heading', { name: 'Agents', exact: true }),
  ).toBeVisible();
});

When('I return to New Session', async ({ page }) => {
  await page.goBack();
  await expect(page).toHaveURL(/\/sessions\/new$/);
});

Given('the Agent download is held', async ({ app }) => {
  await writeInstallation(app.installationPath, false);
});

Then('the first launch shows Loading', async ({ page }) => {
  await openConfiguration(page);
  await expect(page.getByText('Installing…', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Installing Agent' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Agent(?:,|$)/ }),
  ).toBeEnabled();
});

When('the Agent download finishes', async ({ app }) => {
  await writeInstallation(app.installationPath, true);
});

Then('the Composer shows Agent options', async ({ page }) => {
  await waitForEmptySession(page);
  await expect(
    page.getByRole('button', { name: optionsLabel }),
  ).not.toContainText('Loading…');
});

// Escape pops the Agent page, then closes Configure; each press waits for the Frame to take it.
async function closeAgentPicker(
  page: Parameters<typeof readAgents>[0],
): Promise<void> {
  const options = page.getByRole('dialog', { name: optionsLabel });

  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(options).toBeHidden({ timeout: 500 });
  }).toPass();
}

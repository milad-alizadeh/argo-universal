import { writeFile } from 'node:fs/promises';
import { expect } from '../fixtures';
import { readAgents } from './agents';
import { Given, When, Then } from './fixtures';
import { waitForEmptySession } from './new-session';

const optionsLabel = 'Agent and model';

const selectAgentLabel = 'Select Agent';

Given('no Agents are installed', async ({ page, server }) => {
  expect(await readAgents(page, server.httpUrl)).toEqual([]);
});

Then(
  'the Agent picker offers only Add Agents and Send is disabled',
  async ({ page }) => {
    await checkZeroAgentComposer(page);
    await page
      .getByRole('button', { name: selectAgentLabel, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Add Agents', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Claude', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
  },
);

async function checkZeroAgentComposer(
  page: Parameters<typeof readAgents>[0],
): Promise<void> {
  await expect(
    page.getByRole('button', { name: selectAgentLabel, exact: true }),
  ).toContainText(selectAgentLabel);
  await expect(page.getByRole('button', { name: optionsLabel })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeDisabled();
}

When('I type {string} and open Add Agents', async ({ page }, text: string) => {
  await page.getByRole('textbox', { name: 'Message' }).fill(text);
  await page
    .getByRole('button', { name: selectAgentLabel, exact: true })
    .click();
  await page.getByRole('button', { name: 'Add Agents', exact: true }).click();
});

Then('the Agents page is open', async ({ page }) => {
  await expect(page).toHaveURL(/\/settings\/agents$/);
  await expect(
    page.getByRole('heading', { name: 'Agents', exact: true }),
  ).toBeVisible();
});

When('I return to New Session', async ({ page }) => {
  await page.goBack();
  await expect(page).toHaveURL(/\/sessions\/new$/);
});

Given('the Agent download is held', async ({ app }) => {
  await writeFile(
    app.installationPath,
    JSON.stringify({ outcome: 'success', released: false }),
  );
});

Then('the first launch shows Loading', async ({ page }) => {
  await expect(page.getByRole('button', { name: optionsLabel })).toContainText(
    'Loading…',
  );
});

When('the Agent download finishes', async ({ app }) => {
  await writeFile(
    app.installationPath,
    JSON.stringify({ outcome: 'success', released: true }),
  );
});

Then('the Composer shows Agent options', async ({ page }) => {
  await waitForEmptySession(page);
  await expect(
    page.getByRole('button', { name: optionsLabel }),
  ).not.toContainText('Loading…');
});

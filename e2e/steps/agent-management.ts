import { expect } from '../fixtures';
import { agentCard, browseAgents } from './agent-catalog';
import { When, Then } from './fixtures';
import { onPhone } from './frame';
import { openNewSession } from './new-session';

const exampleName = 'Example Agent';

When('I install Example Agent from its card', async ({ page }) => {
  await agentCard(page, exampleName)
    .getByRole('button', {
      name: onPhone(page) ? 'Install Example Agent' : 'Install',
      exact: true,
    })
    .click();
});

Then(
  'Example Agent moves into the installed group and picker',
  async ({ page }) => {
    await expect(
      agentCard(page, exampleName).getByRole('button', {
        name: onPhone(page) ? 'Remove Example Agent' : 'Remove',
        exact: true,
      }),
    ).toBeVisible();
    await openSessionsSection(page);
    await openNewSession(page);
    await checkPickerAndReturn(page);

    await browseAgents(page);
  },
);

When('I remove Example Agent from its card', async ({ page }) => {
  await agentCard(page, exampleName)
    .getByRole('button', {
      name: onPhone(page) ? 'Remove Example Agent' : 'Remove',
      exact: true,
    })
    .click();
});

Then(
  'Example Agent is offered for Install without a confirmation',
  async ({ page }) => {
    await expect(page.getByRole('dialog', { name: /Remove/ })).toHaveCount(0);
    await expect(
      agentCard(page, exampleName).getByRole('button', {
        name: onPhone(page) ? 'Install Example Agent' : 'Install',
        exact: true,
      }),
    ).toBeVisible();
  },
);

async function openSessionsSection(
  page: Parameters<typeof openNewSession>[0],
): Promise<void> {
  if (onPhone(page)) {
    await page
      .getByRole('link', { name: 'Settings, back', exact: true })
      .click();
    await page.getByRole('button', { name: 'Open navigation' }).click();
  }

  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
}

async function checkPickerAndReturn(
  page: Parameters<typeof openNewSession>[0],
): Promise<void> {
  await page.getByRole('button', { name: 'Select Agent', exact: true }).click();
  await expect(
    page.getByRole('button', { name: exampleName, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  if (onPhone(page))
    await page.getByRole('link', { name: 'Sessions, back' }).click();
}

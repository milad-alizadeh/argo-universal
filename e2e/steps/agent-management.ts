import { expect } from '../fixtures';
import { agentCard, browseAgents } from './agent-catalog';
import { closeAgentMenus } from './agent-menus';
import { When, Then } from './fixtures';
import { onPhone } from './frame';
import {
  agentModelLabel,
  openConfiguration,
  openNewSession,
} from './new-session';
import { toast } from './toasts';

const exampleName = 'Example Agent';

When('I install Example Agent from its card', async ({ page }) => {
  await agentCard(page, exampleName)
    .getByRole('button', {
      name: 'Install Example Agent',
      exact: true,
    })
    .click();
});

// The toast then leaves on its own, uncovering the phone header beneath it.
Then(
  'a toast says {string} and then dismisses',
  async ({ page }, text: string) => {
    await expect(toast(page, text)).toBeVisible();
    await expect(toast(page, text)).toHaveCount(0, { timeout: 10_000 });
  },
);

Then(
  'Example Agent moves into the installed group and picker',
  async ({ page }) => {
    await expect(
      agentCard(page, exampleName).getByRole('button', {
        name: 'Remove Example Agent',
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
      name: 'Remove Example Agent',
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
        name: 'Install Example Agent',
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
  await openConfiguration(page);
  await page.getByRole('button', { name: /^Agent(?:,|$)/ }).click();
  await expect(
    page.getByRole('button', { name: exampleName, exact: true }),
  ).toBeVisible();
  await closeAgentMenus(page, agentModelLabel);

  if (onPhone(page))
    await page.getByRole('link', { name: 'Sessions, back' }).click();
}

import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { When, Then } from './fixtures';
import { agentId, type Unavailable } from './scenario-agents';

const statuses = {
  'not installed': 'Not installed',
  'not signed in': 'Not signed in',
};

const agentChoice = async (
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<{ label: string; choice: Locator }> => {
  const { label } = await readAgent(page, httpUrl, ordinal);

  return {
    label,
    choice: page.getByRole('button', { name: `Select ${label}` }),
  };
};

Then(
  'Agent {int} shows {string} instead of accepting a prompt',
  async (
    { page, server },
    ordinal: number,
    state: Unavailable,
  ): Promise<void> => {
    const { label, choice } = await agentChoice(page, server.httpUrl, ordinal);
    await expect(choice).toContainText(statuses[state]);
    await expect(choice).toBeDisabled();
    await expect(
      page.getByRole('button', { name: `Set up ${label}` }),
    ).toHaveText('Sign in');
  },
);

// An Agent that is not installed is installed from Settings, so New Session offers no step.
Then(
  'Agent {int} shows {string} without a setup step',
  async (
    { page, server },
    ordinal: number,
    state: Unavailable,
  ): Promise<void> => {
    const { label, choice } = await agentChoice(page, server.httpUrl, ordinal);
    await expect(choice).toContainText(statuses[state]);
    await expect(choice).toBeDisabled();
    await expect(
      page.getByRole('button', { name: `Set up ${label}` }),
    ).toHaveCount(0);
  },
);

When(
  'I set up Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await page.getByRole('button', { name: `Set up ${label}` }).click();
  },
);

Then(
  'the Settings show Agent {int}',
  async ({ page }, ordinal: number): Promise<void> => {
    await expect(page).toHaveURL(
      new RegExp(`/settings/agents/${agentId(ordinal)}$`),
    );
  },
);

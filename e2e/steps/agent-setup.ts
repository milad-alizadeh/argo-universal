import { expect } from '../fixtures';
import { readAgent } from './agents';
import { When, Then } from './fixtures';
import { agentId, type Unavailable } from './scenario-agents';

const setupSteps = {
  'not installed': { status: 'Not installed', setup: 'Install' },
  'not signed in': { status: 'Not signed in', setup: 'Sign in' },
};

Then(
  'Agent {int} shows {string} instead of accepting a prompt',
  async (
    { page, server },
    ordinal: number,
    state: Unavailable,
  ): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    const choice = page.getByRole('button', { name: `Select ${label}` });
    await expect(choice).toContainText(setupSteps[state].status);
    await expect(choice).toBeDisabled();
    await expect(
      page.getByRole('button', { name: `Set up ${label}` }),
    ).toHaveText(setupSteps[state].setup);
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

import { expect } from '../fixtures';
import { readAgent } from './agents';
import { When, Then } from './fixtures';
import { agentId, type SetupState } from './scenario-agents';

// Each status's label under the Agent, and the one action beside it.
const setupSteps: Record<SetupState, { status: string; setup: string }> = {
  'not installed': { status: 'Not installed', setup: 'Install' },
  'sign-in needed': { status: 'Sign-in needed', setup: 'Sign in' },
  "can't start": { status: 'Can’t start', setup: 'Recheck' },
};

Then(
  'Agent {int} shows {string} instead of accepting a prompt',
  async (
    { page, server },
    ordinal: number,
    state: SetupState,
  ): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    const choice = page.getByRole('button', { name: `Select ${label}` });
    const { status, setup } = setupSteps[state];
    await expect(choice).toContainText(status);
    await expect(choice).toBeDisabled();
    await expect(
      page.getByRole('button', { name: `${setup} ${label}` }),
    ).toHaveText(setup);
  },
);

When(
  'I set up Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await page
      .getByRole('button', { name: new RegExp(`^(Install|Sign in) ${label}$`) })
      .click();
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

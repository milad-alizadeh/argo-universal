import { expect } from '../fixtures';
import { readAgent, readAgents } from './agents';
import { Given, When, Then } from './fixtures';
import { messageLabel, openNewSession } from './new-session';
import { setupStatuses, type SetupState } from './scenario-agents';

Given(
  'every Agent is {string}',
  async ({ page, server }, state: SetupState): Promise<void> => {
    const agents = await readAgents(page, server.httpUrl);
    expect(
      agents.every(
        (agent): boolean =>
          agent.status === setupStatuses[state] && Boolean(agent.reason),
      ),
    ).toBe(true);
  },
);

Given(
  'Agent {int} is {string}',
  async (
    { page, server },
    ordinal: number,
    state: SetupState,
  ): Promise<void> => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      status: setupStatuses[state],
      reason: expect.any(String),
    });
  },
);

When('I open a New Session', async ({ page }): Promise<void> => {
  await openNewSession(page);
});

Then('New Session cannot send a prompt', async ({ page }): Promise<void> => {
  await page.getByRole('textbox', { name: messageLabel }).fill('Hello');
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeDisabled();
});

import { expect } from '../fixtures';
import { readAgent, readAgents } from './agents';
import { Given, When, Then } from './fixtures';
import { openNewSession } from './new-session';
import { availabilityValue, type Unavailable } from './scenario-agents';

Given(
  'every Agent is {string}',
  async ({ page, server }, state: Unavailable): Promise<void> => {
    const expected = availabilityValue(state);
    const agents = await readAgents(page, server.httpUrl);
    expect(
      agents.every(
        (agent): boolean =>
          agent.availability === expected && Boolean(agent.installStep),
      ),
    ).toBe(true);
  },
);

Given(
  'Agent {int} is {string}',
  async (
    { page, server },
    ordinal: number,
    state: Unavailable,
  ): Promise<void> => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      availability: availabilityValue(state),
      installStep: expect.any(String),
    });
  },
);

When('I open a New Session', async ({ page }): Promise<void> => {
  await openNewSession(page);
});

When(
  'I view the Agent choices in New Session',
  async ({ page }): Promise<void> => {
    await openNewSession(page);
    await page.getByRole('button', { name: 'Agent and model' }).click();
    await page.getByRole('button', { name: 'Choose Agent' }).click();
  },
);

Then(
  "New Session shows the first Agent's setup step",
  async ({ page, server }): Promise<void> => {
    const [first] = await readAgents(page, server.httpUrl);
    await expect(page.getByRole('alert')).toHaveText(first?.installStep ?? '');
  },
);

Then('New Session cannot send a prompt', async ({ page }): Promise<void> => {
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Open Session' }),
  ).toBeDisabled();
});

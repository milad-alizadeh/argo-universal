import { expect } from '../fixtures';
import { readAgent } from './agents';
import { When, Then } from './fixtures';
import { agentModelLabel, openNewSession } from './new-session';

When(
  'I choose Add a new agent in New Session',
  async ({ page }): Promise<void> => {
    await openNewSession(page);
    await page.getByRole('button', { name: agentModelLabel }).click();
    await page.getByRole('button', { name: /^Agent,/ }).click();
    await page
      .getByRole('button', { name: 'Add a new agent', exact: true })
      .click();
  },
);

// The registry fixture's Example Agent is offered; the saved fixture Agent is installed, so it is filtered out.
Then(
  'the Agents page lists only the Agents not yet installed',
  async ({ page, server }): Promise<void> => {
    await expect(page).toHaveURL(/\/settings\/agents\?filter=not-installed$/);
    await expect(
      page.getByRole('link', { name: /^Example Agent,/ }),
    ).toBeVisible();
    const { label } = await readAgent(page, server.httpUrl, 1);
    await expect(
      page.getByRole('link', { name: new RegExp(`^${label},`) }),
    ).toHaveCount(0);
  },
);

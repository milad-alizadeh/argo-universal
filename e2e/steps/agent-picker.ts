import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { closeAgentMenus } from './agent-menus';
import { listAgents, readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import {
  agentModelLabel,
  chooseAgent,
  openAgentChoices,
  openNewSession,
} from './new-session';
import { agentId } from './scenario-agents';
import { mutate } from './server-query';
import { toast } from './toasts';

const addAgentLabel = 'Add a new agent';
const pickerRows = /^Select |^Add a new agent$/;

// The picker's rows in order, read until the saved statuses settle.
async function expectPickerRows(page: Page, rows: string[]): Promise<void> {
  await openAgentChoices(page);
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: pickerRows })
        .evaluateAll((found) =>
          found.map((row) => row.getAttribute('aria-label') ?? ''),
        ),
    )
    .toEqual(rows);
  await closeAgentMenus(page, agentModelLabel);
}

When(
  'I choose Add a new agent in New Session',
  async ({ page }): Promise<void> => {
    await openNewSession(page);
    await openAgentChoices(page);
    await page
      .getByRole('button', { name: addAgentLabel, exact: true })
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

Given(
  'Agent {int} is disabled',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await mutate({
      page,
      httpUrl: server.httpUrl,
      procedure: 'agents.setEnabled',
      input: { agentId: agentId(ordinal), enabled: false },
    });
  },
);

Then(
  'the Agent picker offers only Agent {int} and Add a new agent',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await expectPickerRows(page, [`Select ${label}`, addAgentLabel]);
  },
);

// Until Get started fills New Session's empty state, it offers no Agent control at all.
Then('New Session offers no Agent to pick', async ({ page }): Promise<void> => {
  await expect(page.getByRole('button', { name: agentModelLabel })).toHaveCount(
    0,
  );
});

Then(
  'the Agents page still lists Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await browseAgents(page);
    await expect(
      page.getByRole('link', { name: new RegExp(`^${label},`) }),
    ).toBeVisible();
  },
);

// Read as saved now: waiting for every check to finish would wait out the held one.
async function savedLabel(
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<string> {
  const id = agentId(ordinal);
  const listed = await listAgents(page, httpUrl);
  return listed.find(({ agent }) => agent === id)?.label ?? id;
}

// The fixture holds the check from Server start until the Server's 15 s check timeout; the Agent is Checking… until then.
Given(
  "Agent {int}'s readiness check never answers",
  async ({ page, server }, ordinal: number): Promise<void> => {
    const listed = await listAgents(page, server.httpUrl);
    expect(listed.find(({ agent }) => agent === agentId(ordinal))?.status).toBe(
      'checking',
    );
  },
);

// Checking… has a spinner and no action: the row can't be picked and holds no button of its own.
Then(
  'the Agent picker shows Agent {int} Checking… with no action',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const label = await savedLabel(page, server.httpUrl, ordinal);
    await openAgentChoices(page);
    const row = page.getByRole('button', { name: `Select ${label}` });
    await expect(
      row.getByRole('progressbar', { name: 'Checking…' }),
    ).toBeVisible();
    await expect(row).toBeDisabled();
    await expect(row.getByRole('button')).toHaveCount(0);
    await closeAgentMenus(page, agentModelLabel);
  },
);

Then(
  'I can pick Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    await chooseAgent(page, await savedLabel(page, server.httpUrl, ordinal));
  },
);

When(
  'I pick Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await openAgentChoices(page);
    await page.getByRole('button', { name: `Select ${label}` }).click();
  },
);

Then(
  "a toast says the Session couldn't open because {string}",
  async ({ page }, reason: string): Promise<void> => {
    await expect(toast(page, "Couldn't open the Session")).toBeVisible({
      timeout: 15_000,
    });
    await expect(toast(page, reason, false)).toBeVisible();
    await closeAgentMenus(page, agentModelLabel);
  },
);

// Read after the picker has settled, so a repeated failure would have shown by now.
Then(
  "no second toast says the Session couldn't open",
  async ({ page }): Promise<void> => {
    expect(
      await toast(page, "Couldn't open the Session").count(),
    ).toBeLessThanOrEqual(1);
  },
);

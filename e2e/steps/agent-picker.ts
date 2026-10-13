import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { closeAgentMenus } from './agent-menus';
import { type ListedAgent, listAgents, readAgent, readAgents } from './agents';
import { Given, When, Then } from './fixtures';
import { agentModelLabel, messageLabel, openNewSession } from './new-session';
import { agentId } from './scenario-agents';
import { mutate } from './server-query';
import { toast } from './toasts';

const addAgentLabel = 'Add a new agent';
const pickerRows = /^Select |^Add a new agent$/;

async function openAgentChoices(page: Page): Promise<void> {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await page.getByRole('button', { name: /^Agent,/ }).click();
}

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

// Its readiness check never answers, so the Agent stays Checking… until the check times out.
Given(
  'Agent {int} is still being checked',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const id = agentId(ordinal);
    const listed = await listAgents(page, server.httpUrl);
    expect(listed.find(({ agent }) => agent === id)?.status).toBe('checking');
  },
);

const labelOf = (listed: ListedAgent[], ordinal: number): string =>
  listed.find(({ agent }) => agent === agentId(ordinal))?.label ?? '';

Then(
  'the Agent picker shows Agent {int} checking and Agent {int} ready',
  async ({ page, server }, checking: number, ready: number): Promise<void> => {
    const listed = await listAgents(page, server.httpUrl);
    await openAgentChoices(page);
    const pending = page.getByRole('button', {
      name: `Select ${labelOf(listed, checking)}`,
    });
    await expect(
      pending.getByRole('progressbar', { name: 'Checking…' }),
    ).toBeVisible();
    await expect(pending).toBeDisabled();
    await expect(
      page.getByRole('button', { name: `Select ${labelOf(listed, ready)}` }),
    ).toBeEnabled();
  },
);

Given(
  'every Agent refuses to open a Session',
  async ({ page, server }): Promise<void> => {
    // The refusal shows only when a Session opens, so every Agent is listed as Ready.
    for (const { status } of await readAgents(page, server.httpUrl))
      expect(status).toBe('ready');
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

When(
  'I write the prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await page.getByRole('textbox', { name: messageLabel }).fill(prompt);
  },
);

Then(
  "one toast says the Session couldn't open because {string}",
  async ({ page }, reason: string): Promise<void> => {
    await expect(toast(page, "Couldn't open the Session")).toBeVisible({
      timeout: 15_000,
    });
    await expect(toast(page, reason, false)).toHaveCount(1);
    await closeAgentMenus(page, agentModelLabel);
  },
);

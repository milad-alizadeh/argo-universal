import type { Page, Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { requests } from './agent-requests';
import { expectListedAgent } from './agents';
import { Given, Then, When } from './fixtures';
import {
  queueSnapshot,
  textOf,
  completedQueuePrompts,
} from './queue-observations';

const queueId = 'prompt-queue';

const editLabel = 'Edit Queued Prompt';

const promptMethod = 'session/prompt';

function rowNamed(page: Page, text: string): Locator {
  return page
    .getByTestId(queueId)
    .getByRole('group', { name: text, exact: true });
}

When(
  'I edit Queued Prompt {string} to {string} and save',
  async ({ page }, before: string, after: string): Promise<void> => {
    const row = rowNamed(page, before);
    await row.getByRole('button', { name: editLabel }).click();
    await row.getByRole('textbox', { name: editLabel }).fill(after);
    await row.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(rowNamed(page, after)).toBeVisible();
  },
);

When(
  'I cancel editing Queued Prompt {string} after writing {string}',
  async ({ page }, before: string, after: string): Promise<void> => {
    const row = rowNamed(page, before);
    await row.getByRole('button', { name: editLabel }).click();
    await row.getByRole('textbox', { name: editLabel }).fill(after);
    await row.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(row.getByText(before, { exact: true })).toBeVisible();
  },
);

When(
  'I begin editing Queued Prompt {string}',
  async ({ page }, text: string): Promise<void> => {
    const row = rowNamed(page, text);
    await row.getByRole('button', { name: editLabel }).click();
    await expect(row.getByRole('textbox', { name: editLabel })).toBeEditable();
  },
);

When('I cancel the queue edit', async ({ page }): Promise<void> => {
  await page
    .getByTestId(queueId)
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
});

When(
  'I delete Queued Prompt {string}',
  async ({ page }, text: string): Promise<void> => {
    await rowNamed(page, text)
      .getByRole('button', { name: 'Delete Queued Prompt' })
      .click();
    await expect(rowNamed(page, text)).toHaveCount(0);
  },
);

When(
  'I move Queued Prompt {string} up',
  async ({ page }, text: string): Promise<void> => {
    await rowNamed(page, text)
      .getByRole('button', { name: 'Move Prompt up' })
      .click();
  },
);

When('I resume the queue', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Resume queue', exact: true }).click();
});

Then(
  'the queue is paused because {string}',
  async ({ page }, reason: string): Promise<void> => {
    await expect(
      page.getByTestId(queueId).getByText(reason, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Resume queue', exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the queued Prompts read {string}',
  async ({ page, server }, joined: string): Promise<void> => {
    await expect
      .poll(async () =>
        (await queueSnapshot(page, server.httpUrl)).promptQueue.items.map(
          (row) => textOf(row.prompt),
        ),
      )
      .toEqual(joined.split('|'));
  },
);

Then(
  'the Feed has completed Prompts in order {string}',
  async ({ page, server, app }, joined: string): Promise<void> => {
    await completedQueuePrompts(page, server.httpUrl, joined);
    expect(requests(app.requestLogPath, promptMethod)).toHaveLength(
      joined.split('|').length,
    );
    await expect(page.getByTestId(queueId)).toHaveCount(0);
  },
);

Then(
  'editing keeps the queue waiting after completion',
  async ({ page, server, app }): Promise<void> => {
    await expect
      .poll(
        async () => (await queueSnapshot(page, server.httpUrl)).activeTurnId,
      )
      .toBeNull();
    expect(requests(app.requestLogPath, promptMethod)).toHaveLength(1);
    await expect(
      page.getByTestId(queueId).getByRole('textbox', { name: editLabel }),
    ).toBeEditable();
  },
);

Given('Agent {int} fails its second queued Turn', expectListedAgent);

Given('Agent {int} refuses queued images', expectListedAgent);

Given('Agent {int} holds its first Turn until released', expectListedAgent);

import type { Page, Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { dragPromptUp } from '../queue-drag';
import { expectListedAgent } from './agents';
import { requests } from './conversation-requests';
import { Given, Then, When } from './fixtures';
import {
  queueSnapshot,
  textOf,
  completedQueuePrompts,
} from './queue-observations';

const queueId = 'prompt-queue';

const editLabel = 'Edit Queued Prompt';

const promptMethod = 'session/prompt';

const cancelLabel = 'Cancel queue edit';

function rowNamed(page: Page, text: string): Locator {
  return page
    .getByTestId(queueId)
    .getByTestId('queued-prompt-row')
    .filter({ has: page.getByRole('group', { name: text, exact: true }) });
}

// Holding an edit is a Server round trip; until it finishes, Message still edits the separate draft.
async function beginQueueEdit(page: Page, text: string): Promise<Locator> {
  await rowNamed(page, text).getByRole('button', { name: editLabel }).click();
  await expect(
    page.getByRole('button', { name: cancelLabel, exact: true }),
  ).toBeVisible();
  const field = page.getByRole('textbox', { name: 'Message', exact: true });
  await expect(field).toHaveText(text);

  return field;
}

When(
  'I edit Queued Prompt {string} to {string} and save',
  async ({ page }, before: string, after: string): Promise<void> => {
    const field = await beginQueueEdit(page, before);
    await field.fill(after);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(rowNamed(page, after)).toBeVisible();
    await expect(
      page.getByRole('button', { name: cancelLabel, exact: true }),
    ).toBeHidden();
  },
);

When(
  'I cancel editing Queued Prompt {string} after writing {string}',
  async ({ page }, before: string, after: string): Promise<void> => {
    const field = await beginQueueEdit(page, before);
    await field.fill(after);
    await page.getByRole('button', { name: cancelLabel, exact: true }).click();
    await expect(
      page.getByRole('button', { name: cancelLabel, exact: true }),
    ).toBeHidden();
    await expect(rowNamed(page, before)).toBeVisible();
  },
);

When(
  'I begin editing Queued Prompt {string}',
  async ({ page }, text: string): Promise<void> => {
    await expect(await beginQueueEdit(page, text)).toBeEditable();
  },
);

When('I cancel the queue edit', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: cancelLabel, exact: true }).click();
});

When(
  'I delete Queued Prompt {string}',
  async ({ page }, text: string): Promise<void> => {
    await page.mouse.move(0, 0);
    await rowNamed(page, text)
      .getByRole('button', { name: 'Delete Queued Prompt' })
      .click();
    await expect(rowNamed(page, text)).toHaveCount(0);
  },
);

When(
  'I drag Queued Prompt {string} up',
  async ({ page }, text: string): Promise<void> => {
    await dragPromptUp(page, rowNamed(page, text));
  },
);

// With nothing written, Send resumes a paused queue.
When('I resume the queue', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Send', exact: true }).click();
});

Then(
  'the queue is paused because {string}',
  async ({ page, server }, reason: string): Promise<void> => {
    await expect
      .poll(
        async () =>
          (await queueSnapshot(page, server.httpUrl)).promptQueue.pauseReason,
      )
      .toBe(reason);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeEnabled();
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
      page.getByRole('textbox', { name: 'Message', exact: true }),
    ).toBeEditable();
  },
);

Given('Agent {int} fails its second queued Turn', expectListedAgent);

Given('Agent {int} refuses queued images', expectListedAgent);

Given('Agent {int} holds its first Turn until released', expectListedAgent);

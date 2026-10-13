import type { Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';

const feedScroll = 'feed-scroll';
const commandTitle = 'Check greeting';
const groupTitle = 'Ran 1 command, Edited 1 file';

Given(
  /^Agent (\d+) supplies (?:edits and commands|an unfinished command)$/,
  async ({ page, server }, ordinal: string): Promise<void> => {
    expect(
      await readAgent(page, server.httpUrl, Number(ordinal)),
    ).toMatchObject({ status: 'ready' });
  },
);

async function openEdit(feed: Locator): Promise<void> {
  const edit = feed.getByRole('button', { name: /greeting.txt/ });
  await expect(edit).toContainText('+1');
  await expect(edit).toContainText('-1');
  await edit.click();
  await expect(feed.getByText('Hello Argo', { exact: true })).toBeVisible();
}

Then(
  'the Feed shows the edit and command from the completed Turn',
  async ({ page }): Promise<void> => {
    const feed = page.getByTestId(feedScroll);
    await expect(
      feed.getByText('The greeting is updated.', { exact: true }),
    ).toBeVisible();
    await feed.getByRole('button', { name: groupTitle, exact: true }).click();
    await openEdit(feed);
    await feed.getByRole('button', { name: commandTitle, exact: true }).click();
    await expect(
      feed.getByText('Greeting check passed', { exact: true }),
    ).toBeVisible();
  },
);

When('the command is running in the Feed', async ({ page }): Promise<void> => {
  await expect(
    page
      .getByTestId(feedScroll)
      .getByRole('button', { name: commandTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeVisible();
});

When('the Engine restarts', async ({ app, page }): Promise<void> => {
  await app.restartEngine(async () => {
    await expect(
      page.getByText('Reconnecting…', { exact: true }).first(),
    ).toBeVisible();
  });
  await expect(page.getByTestId(feedScroll)).toBeVisible({ timeout: 30_000 });
});

Then(
  'the Feed keeps the prompt and catches up to the failed command',
  async ({ page }): Promise<void> => {
    const feed = page.getByTestId(feedScroll);
    await expect(feed.getByText('Run the checks', { exact: true })).toHaveCount(
      1,
    );
    await openFailedCommand(feed);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0);
  },
);

async function openFailedCommand(feed: Locator): Promise<void> {
  await feed.getByRole('button', { name: groupTitle, exact: true }).click();
  await expect(
    feed.getByRole('button', { name: /greeting.txt/ }),
  ).toBeVisible();
  await feed.getByRole('button', { name: commandTitle, exact: true }).click();
  await expect(feed.getByText('Failed', { exact: true })).toBeVisible();
  await expect(
    feed.getByText('Greeting check passed', { exact: true }),
  ).toHaveCount(0);
}

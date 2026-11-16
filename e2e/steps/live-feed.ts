import type { Locator, Page } from '@playwright/test';
import { type App, expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';

const feedScroll = 'feed-scroll';

const commandLine = 'cat greeting.txt';

const groupTitle = 'Ran 1 command, Edited 1 file';

// The running command's own title, which titles its group while it runs.
const runningTitle = 'Check greeting';

Given(
  /^Agent (\d+) supplies (?:edits and commands|an unfinished command)$/,
  async ({ page, server }, ordinal: string): Promise<void> => {
    expect(
      await readAgent(page, server.httpUrl, Number(ordinal)),
    ).toMatchObject({ id: expect.any(String) });
  },
);

// A hidden window paints no frames on Linux, so Playwright's stable check never ends; dispatch the click.
async function clickGroup(group: Locator, hidden: boolean): Promise<void> {
  await (hidden
    ? group.evaluate<void, void, HTMLElement>((el) => el.click())
    : group.click());
}

async function openGroupTitled(
  feed: Locator,
  title: string,
  hidden: boolean,
): Promise<void> {
  const group = feed.getByRole('button', { name: title, exact: true });

  if ((await group.getAttribute('aria-expanded')) !== 'true')
    await clickGroup(group, hidden);

  await expect(group).toHaveAttribute('aria-expanded', 'true');
}

const openGroup = (feed: Locator): Promise<void> =>
  openGroupTitled(feed, groupTitle, false);

async function openEdit(feed: Locator): Promise<void> {
  const edit = feed.getByRole('button', { name: /^Edited greeting\.txt/ });
  await expect(edit).toContainText('+1');
  await expect(edit).toContainText('−1');
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
    await openGroup(feed);
    await openEdit(feed);
    await feed.getByRole('button', { name: commandLine, exact: true }).click();
    await expect(
      feed.getByText('Greeting check passed', { exact: true }),
    ).toBeVisible();
  },
);

/*
 * The unfinished command's Turn is running, its Stop shown. The running command titles its group
 * and says its title once: its row draws only its output, with no title of its own.
 */
async function expectUntitledCommand(feed: Locator): Promise<void> {
  await expect(
    feed
      .getByText(/cat greeting\.txt/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    feed.getByRole('button', { name: commandLine, exact: true }),
  ).toHaveCount(0);
}

export async function expectRunningCommand(page: Page): Promise<void> {
  const feed = page.getByTestId(feedScroll);
  // Callers may have hidden the desktop window.
  await openGroupTitled(feed, runningTitle, true);
  await expectUntitledCommand(feed);
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toBeVisible();
}

When('the command is running in the Feed', async ({ page }): Promise<void> => {
  await expectRunningCommand(page);
});

// Restarts the Engine once the page shows it is gone.
export async function restartEngine(
  app: Pick<App, 'restartEngine'>,
  page: Page,
): Promise<void> {
  await app.restartEngine(async () => {
    await expect(
      // Each page in a section's stack has its banner; the shown page's is the visible one.
      page
        .getByText('Reconnecting…', { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });
}

When('the Engine restarts', async ({ app, page }): Promise<void> => {
  await restartEngine(app, page);
  await expect(page.getByTestId(feedScroll)).toBeVisible({ timeout: 30_000 });
});

Then(
  'the Feed keeps the prompt and catches up to the stopped command',
  async ({ page }): Promise<void> => {
    const feed = page.getByTestId(feedScroll);
    await expect(feed.getByText('Run the checks', { exact: true })).toHaveCount(
      1,
    );
    await openStoppedCommand(feed);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0);
  },
);

async function openStoppedCommand(feed: Locator): Promise<void> {
  await openGroup(feed);
  await expect(
    feed.getByRole('button', { name: /^Edited greeting\.txt/ }),
  ).toBeVisible();
  await feed.getByRole('button', { name: commandLine, exact: true }).click();
  await expect(feed.getByText('Stopped', { exact: true })).toBeVisible();
  await expect(
    feed.getByText('Greeting check passed', { exact: true }),
  ).toHaveCount(0);
}

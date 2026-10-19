import { realpathSync } from 'node:fs';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { expect } from '../fixtures';
import { type LoggedRequest, localRequests } from './agent-requests';
import { readAgent } from './agents';
import { When, Then } from './fixtures';
import {
  agentModelLabel,
  chooseAgent,
  waitForEmptySession,
} from './new-session';

const checkedAttribute = 'aria-checked';

const argoBranches = async (projectPath: string): Promise<string[]> =>
  (await readSessionCheckouts(projectPath)).branches;

export const openRequests = (requestLogPath: string): LoggedRequest[] =>
  localRequests(requestLogPath, 'session/new');

// The folder a Session opened in; temporary folders are reached through symlinks on macOS.
const openedIn = ({ params }: LoggedRequest): string | undefined =>
  params?.cwd === undefined ? undefined : realpathSync(params.cwd);

const closeRequests = (requestLogPath: string): number =>
  localRequests(requestLogPath, 'session/close').length;

// A Local New Session opens its empty Session in the Project folder at once.
When('the empty Session is open', async ({ page, app }): Promise<void> => {
  await expect
    .poll(() => openRequests(app.requestLogPath).map(openedIn))
    .toEqual([realpathSync(app.projectPath)]);
  await waitForEmptySession(page);
});

When(
  'I choose Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { name: label } = await readAgent(page, server.httpUrl, ordinal);
    await chooseAgent(page, label);
    await waitForEmptySession(page);
  },
);

Then('the Agent closed the empty Session', async ({ app }): Promise<void> => {
  await expect
    .poll(() => closeRequests(app.requestLogPath))
    .toBeGreaterThanOrEqual(1);
});

Then('the Agent closed no Session', async ({ app }): Promise<void> => {
  expect(closeRequests(app.requestLogPath)).toBe(0);
});

Then(
  'the empty Session left no worktree or branch',
  async ({ app }): Promise<void> => {
    await expect
      .poll(() => readSessionCheckouts(app.projectPath))
      .toEqual({ branches: [], worktrees: 1 });
  },
);

Then('only the new empty Session remains', async ({ app }): Promise<void> => {
  await expect
    .poll(() => ({
      opened: openRequests(app.requestLogPath).length,
      closed: closeRequests(app.requestLogPath),
    }))
    .toEqual({ opened: 2, closed: 1 });
});

// No second Session opened, so the prompt went to the one opened before the drop.
Then(
  'the prompt went to the Session opened before the drop',
  async ({ app }): Promise<void> => {
    expect(openRequests(app.requestLogPath)).toHaveLength(1);
  },
);

// Sessions the Agent opened outside the Project folder: only a New worktree's, at Send.
const worktreeOpens = (app: {
  requestLogPath: string;
  projectPath: string;
}): LoggedRequest[] =>
  openRequests(app.requestLogPath).filter(
    (request) => openedIn(request) !== realpathSync(app.projectPath),
  );

// Reading a never-opened Agent's options may open an ACP session in the Project folder, but it closes it and leaves no Session or worktree.
Then('no Session or worktree exists yet', async ({ app }): Promise<void> => {
  await expect
    .poll(() => closeRequests(app.requestLogPath))
    .toBe(openRequests(app.requestLogPath).length);
  expect(worktreeOpens(app)).toEqual([]);
  expect(await argoBranches(app.projectPath)).toEqual([]);
});

Then(
  'the Agent opened one Session in a new worktree',
  async ({ app }): Promise<void> => {
    expect(worktreeOpens(app)).toHaveLength(1);
    expect(await argoBranches(app.projectPath)).toHaveLength(1);
  },
);

Then('no Session is listed', async ({ page }): Promise<void> => {
  await expect(
    page.getByText('No Sessions yet.', { exact: true }),
  ).toBeVisible();
});

When('I enable Fast mode', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await page.getByRole('switch', { name: 'Fast mode', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: agentModelLabel }).click();
  await expect(
    page.getByRole('switch', { name: 'Fast mode', exact: true }),
  ).toHaveAttribute(checkedAttribute, 'true');
  await page.keyboard.press('Escape');
});

Then('Fast mode remains enabled', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await expect(
    page.getByRole('switch', { name: 'Fast mode', exact: true }),
  ).toHaveAttribute(checkedAttribute, 'true');
  await page.keyboard.press('Escape');
});

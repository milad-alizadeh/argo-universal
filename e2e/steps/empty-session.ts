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

const argoBranches = async (projectPath: string): Promise<string[]> =>
  (await readSessionCheckouts(projectPath)).branches;

export const openRequests = (
  app: Parameters<typeof localRequests>[0],
): LoggedRequest[] => localRequests(app, 'session/new');

// The folder a Session opened in; temporary folders are reached through symlinks on macOS.
const openedIn = ({ params }: LoggedRequest): string | undefined =>
  params?.cwd === undefined ? undefined : realpathSync(params.cwd);

const closeRequests = (app: Parameters<typeof localRequests>[0]): number =>
  localRequests(app, 'session/close').length;

When(
  'I choose Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { name: label } = await readAgent(page, server.httpUrl, ordinal);
    await chooseAgent(page, label);
    await waitForEmptySession(page);
  },
);

// Sessions the Agent opened outside the Project folder: only a New worktree's, at Send.
const worktreeOpens = (app: {
  requestLogPath: string;
  projectPath: string;
}): LoggedRequest[] =>
  openRequests(app).filter(
    (request) => openedIn(request) !== realpathSync(app.projectPath),
  );

// Discovery holds its session open for a Slash command list up to the Engine's 10 s cap.
const discoveryCloseMs = 15_000;

// Reading a never-opened Agent's options may open an Agent session in the Project folder, but it closes it and leaves no Session or worktree.
Then('no Session or worktree exists yet', async ({ app }): Promise<void> => {
  await expect
    .poll(() => closeRequests(app), { timeout: discoveryCloseMs })
    .toBe(openRequests(app).length);
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
  ).toBeChecked();
  await page.keyboard.press('Escape');
});

Then('Fast mode remains enabled', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: agentModelLabel }).click();
  await expect(
    page.getByRole('switch', { name: 'Fast mode', exact: true }),
  ).toBeChecked();
  await page.keyboard.press('Escape');
});

import { existsSync, readFileSync } from 'node:fs';
import type { Page, WebSocketRoute } from '@playwright/test';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { z } from 'zod';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { wide } from './frame';
import {
  agentModelLabel,
  chooseAgent,
  messageLabel,
  waitForEmptySession,
} from './new-session';
import { agentWork } from './timeouts';

const checkedAttribute = 'aria-checked';

const LoggedRequest = z.object({ method: z.string() });

const argoBranches = async (projectPath: string): Promise<string[]> =>
  (await readSessionCheckouts(projectPath)).branches;

const closeRequests = (requestLogPath: string): number =>
  existsSync(requestLogPath)
    ? readFileSync(requestLogPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => LoggedRequest.parse(JSON.parse(line)))
        .filter(({ method }) => method === 'session/close').length
    : 0;

// The empty Session's branch, read before the step that should close or keep it.
const openedBranches = new WeakMap<Page, string[]>();

const connections = new WeakMap<Page, WebSocketRoute[]>();

When('the empty Session is open', async ({ page, app }): Promise<void> => {
  await waitForEmptySession(page);
  await expect.poll(() => argoBranches(app.projectPath)).toHaveLength(1);
  openedBranches.set(page, await argoBranches(app.projectPath));
});

When(
  'I choose Agent {int}',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await chooseAgent(page, label);
    await waitForEmptySession(page);
  },
);

const isWide = (page: Page): boolean =>
  (page.viewportSize()?.width ?? 0) >= wide.width;

// A wide Frame shows New Session, whose Empty Session shares every fixture Agent's account; a phone Frame opens none.
export const openedEmptySession = async (page: Page): Promise<boolean> => {
  if (!isWide(page)) return false;
  await expect(page.getByRole('textbox', { name: messageLabel })).toBeVisible();
  await waitForEmptySession(page);

  return true;
};

// The App closes that Empty Session once it leaves New Session.
export const awaitEmptySessionClosed = async (
  requestLogPath: string,
): Promise<void> => {
  await expect
    .poll(() => closeRequests(requestLogPath), agentWork)
    .toBeGreaterThanOrEqual(1);
};

Then('the Agent closed the empty Session', async ({ app }): Promise<void> => {
  await awaitEmptySessionClosed(app.requestLogPath);
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

Then(
  'only the new empty Session remains',
  async ({ page, app }): Promise<void> => {
    const previous = openedBranches.get(page) ?? [];
    await expect
      .poll(async () => {
        const branches = await argoBranches(app.projectPath);

        return {
          count: branches.length,
          previousKept: branches.some((branch) => previous.includes(branch)),
        };
      })
      .toEqual({ count: 1, previousKept: false });
  },
);

Given(
  "the App's Connection can be dropped",
  async ({ page }): Promise<void> => {
    connections.set(page, []);
    await page.routeWebSocket(/ws:\/\//, (route): void => {
      route.connectToServer();
      connections.get(page)?.push(route);
    });
    await page.reload();
  },
);

When('the Connection drops and comes back', async ({ page }): Promise<void> => {
  const routes = connections.get(page) ?? [];
  connections.set(page, []);
  await Promise.all(routes.map((route) => route.close()));
  // The App opens a new WebSocket once it notices.
  await expect
    .poll(() => connections.get(page)?.length ?? 0, { timeout: 15_000 })
    .toBeGreaterThan(0);
  await expect(page.getByText('Reconnecting…')).toHaveCount(0, {
    timeout: 15_000,
  });
});

Then(
  'the prompt went to the Session opened before the drop',
  async ({ page }): Promise<void> => {
    const sessionId = new URL(page.url()).pathname.split('/').at(-1);
    expect(openedBranches.get(page)).toEqual([`argo/${sessionId}`]);
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

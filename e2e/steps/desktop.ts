import type { APIRequestContext } from '@playwright/test';
import { readServerAddress } from '@repo/engine/server-runtime';
import { isAlive } from '@repo/process';
import { z } from 'zod';
import { answerQuitDialog, requestQuit } from '../desktop/native-dialog';
import { expect, type App } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { startSession } from './live-session';

function desktop(app: Pick<App, 'desktop'>): NonNullable<App['desktop']> {
  if (!app.desktop) throw new Error('This scenario needs the Electron App');

  return app.desktop;
}

Given(
  'I start a desktop Session that keeps running',
  async ({ page, app }): Promise<void> => {
    await startSession(page, 'Keep this Session running');
    await expect
      .poll(() =>
        desktop(app).application.evaluate(
          ({ app: electronApp }): string => electronApp.dock?.getBadge() ?? '',
        ),
      )
      .toBe('1');
  },
);

Then(
  'the Dock badge is {string}',
  async ({ app }, badge: string): Promise<void> => {
    const { application } = desktop(app);
    await expect
      .poll(() =>
        application.evaluate(
          ({ app: electronApp }): string => electronApp.dock?.getBadge() ?? '',
        ),
      )
      .toBe(badge);
  },
);

When('I close the desktop window', async ({ page }): Promise<void> => {
  await page.close();
});

When('the desktop Server disconnects', async ({ app }): Promise<void> => {
  await desktop(app).disconnect();
});

When(
  'I quit the desktop App and choose {string}',
  async ({ app }, choice: string): Promise<void> => {
    const { application } = desktop(app);
    const closed = application.waitForEvent('close');
    await Promise.all([
      requestQuit(application),
      answerQuitDialog(application, choice),
      closed,
    ]);
  },
);

When('I quit the desktop App', async ({ app }): Promise<void> => {
  const { application } = desktop(app);
  const closed = application.waitForEvent('close');
  await requestQuit(application);
  await closed;
});

const SessionStates = z.object({
  result: z.object({
    data: z.object({ sessions: z.array(z.object({ status: z.string() })) }),
  }),
});

Then(
  'the desktop Supervisor is {string}',
  async ({ app, request }, state: string): Promise<void> => {
    const { home, supervisorPid } = desktop(app);

    if (state === 'stopped') {
      await expect.poll(() => readServerAddress(home)).toBeNull();
      await expect
        .poll(() => isAlive(supervisorPid), { timeout: 30_000 })
        .toBe(false);

      return;
    }

    await expectRunningSession(app, request);
  },
);

async function expectRunningSession(
  app: Pick<App, 'desktop' | 'httpUrl'>,
  request: APIRequestContext,
): Promise<void> {
  const { home, supervisorPid } = desktop(app);
  expect(readServerAddress(home)?.pid).toBe(supervisorPid);

  const response = await request.get(
    `${app.httpUrl}/trpc/session.list?input=${encodeURIComponent(JSON.stringify({ archived: false }))}`,
  );

  expect(response.ok()).toBe(true);
  const result = SessionStates.parse(await response.json());
  expect(result.result.data.sessions.map((session) => session.status)).toEqual([
    'needs_input',
  ]);
}

import type { Page } from '@playwright/test';
import { desktopApplication, windowState } from '../desktop/window-state';
import { expect } from '../fixtures';
import { sessionId } from './feed';
import { Given, When, Then } from './fixtures';
import { mutate } from './server-query';

const targets = new WeakMap<Page, string>();

const targetSession = (page: Page): string =>
  targets.get(page) ?? sessionId(page);

Given(
  'the next desktop notification delivery fails',
  async ({ page }): Promise<void> => {
    await page.evaluate(() => globalThis.notificationProbe.failNext());
  },
);

Then(
  'desktop notification delivery retries once',
  async ({ page }): Promise<void> => {
    expect(
      await page.evaluate(() => globalThis.notificationProbe.attempts),
    ).toBe(2);
  },
);

Given('the desktop window is focused', async ({ app, page }): Promise<void> => {
  await desktopApplication(app).evaluate(
    ({ app: nativeApp, BrowserWindow }): void => {
      nativeApp.focus({ steal: true });
      BrowserWindow.getAllWindows()[0]?.show();
      BrowserWindow.getAllWindows()[0]?.focus();
    },
  );
  await expect
    .poll(() => windowState(desktopApplication(app)))
    .toMatchObject({ focused: true, visible: true });
  await expect
    .poll(() => page.evaluate<boolean>('document.hasFocus()'))
    .toBe(true);
});

When('I leave the Session for Settings', async ({ page }): Promise<void> => {
  targets.set(page, sessionId(page));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\//);
});

When(
  'another App prompts the notification Session',
  async ({ page, app }): Promise<void> => {
    await mutate({
      page,
      httpUrl: app.httpUrl,
      procedure: 'session.prompt',
      input: {
        sessionId: targetSession(page),
        prompt: [{ type: 'text', text: 'A Turn from another App' }],
      },
    });
  },
);

Then(
  'the notification Session shows {int} completed replies',
  async ({ page }, count: number): Promise<void> => {
    await expect(
      page
        .getByTestId('feed-scroll')
        .getByText('The shared fixture completed this Turn.', { exact: true }),
    ).toHaveCount(count);
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0);
  },
);

Then(
  'the focused window receives one desktop notification saying {string}',
  async ({ page, app }, body: string): Promise<void> => {
    await expect
      .poll(() => windowState(desktopApplication(app)))
      .toMatchObject({ focused: true });
    await expect
      .poll(() => page.evaluate(openNotifications))
      .toMatchObject([{ body, tag: targetSession(page), closed: false }]);
  },
);

const openNotifications = (): typeof globalThis.notificationProbe.records =>
  globalThis.notificationProbe.records.filter((record) => !record.closed);

When(
  'I click the foreground desktop notification',
  async ({ page }): Promise<void> => {
    await page.evaluate(() => globalThis.notificationProbe.click());
  },
);

import type { ElectronApplication } from '@playwright/test';
import { installNotificationStub } from '../desktop/notification-api.test.mocks';
import { type App, expect } from '../fixtures';
import { sessionId } from './feed';
import { Given, When, Then } from './fixtures';

function desktopApplication(app: App): ElectronApplication {
  if (!app.desktop)
    throw new Error('Notifications require the Electron project');

  return app.desktop.application;
}

Given(
  'the desktop Notification API is recorded',
  async ({ page }): Promise<void> => {
    await page.addInitScript(installNotificationStub);
    await page.reload();
  },
);

When(
  'I leave the desktop window {string}',
  async ({ app }, state: string): Promise<void> => {
    const application = desktopApplication(app);
    await application.evaluate(({ BrowserWindow }, next): void => {
      const window = BrowserWindow.getAllWindows()[0];

      if (!window) throw new Error('Expected the App window');

      if (next === 'hidden') window.hide();
      else {
        window.show();
        window.minimize();
      }
    }, state);
    await expect
      .poll(() => windowState(application))
      .toMatchObject({
        focused: false,
        visible: false,
        minimized: state === 'minimized',
      });
  },
);

function windowState(
  application: ElectronApplication,
): Promise<{ focused: boolean; visible: boolean; minimized: boolean }> {
  return application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];

    if (!window) throw new Error('Expected the App window');

    return {
      focused: window.isFocused(),
      visible: window.isVisible(),
      minimized: window.isMinimized(),
    };
  });
}

Then(
  'one desktop notification says {string}',
  async ({ page }, body: string): Promise<void> => {
    await expect
      .poll(() => page.evaluate(() => window.notificationProbe.records))
      .toEqual([
        {
          title: expect.any(String),
          body,
          tag: sessionId(page),
          closed: false,
        },
      ]);
  },
);

When(
  'I click the desktop notification from Settings',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/settings\//);
    await page.evaluate(() => window.notificationProbe.click());
  },
);

Then(
  'the desktop notification opens its Session in the foreground',
  async ({ app, page }): Promise<void> => {
    const [notice] = await page.evaluate(
      () => window.notificationProbe.records,
    );

    if (!notice?.tag) throw new Error('Expected a Session notification');
    await expect(page).toHaveURL(new RegExp(`/sessions/${notice.tag}$`));
    await expect
      .poll(() => windowState(desktopApplication(app)))
      .toEqual({ focused: true, visible: true, minimized: false });
    expect(notice.closed).toBe(true);
  },
);

Then(
  'there is no additional desktop notification',
  async ({ page }): Promise<void> => {
    expect(
      await page.evaluate(() => window.notificationProbe.records),
    ).toHaveLength(1);
  },
);

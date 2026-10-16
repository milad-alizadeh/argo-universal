import type { ElectronApplication } from '@playwright/test';
import { installNotificationStub } from '../desktop/notification-api.test.mocks';
import {
  BackgroundState,
  backgroundWindow,
  windowState,
} from '../desktop/window-state';
import { type App, expect } from '../fixtures';
import { sessionId } from './feed';
import { Given, When, Then } from './fixtures';
import { expectMessage, messageLabel, sessionOpenTimeout } from './new-session';

function desktopApplication(app: App): ElectronApplication {
  if (!app.desktop)
    throw new Error('Notifications require the Electron project');

  return app.desktop.application;
}

Given(
  'the desktop Notification API is recorded',
  async ({ page, app }): Promise<void> => {
    await desktopApplication(app).evaluate(({ BrowserWindow }): void => {
      BrowserWindow.getAllWindows()[0]?.webContents.setBackgroundThrottling(
        true,
      );
    });
    await page.addInitScript(installNotificationStub);
    await page.reload();
    const nativeFocus = await page.context().newCDPSession(page);
    await nativeFocus.send('Emulation.setFocusEmulationEnabled', {
      enabled: false,
    });
  },
);

When(
  'I leave the desktop window {string}',
  async ({ app }, state: string): Promise<void> => {
    const application = desktopApplication(app);
    await backgroundWindow(application, BackgroundState.parse(state));
    await expect
      .poll(() => windowState(application))
      .toMatchObject({
        focused: false,
        visible: state === 'unfocused',
        minimized: state === 'minimized',
      });
  },
);

Then(
  'one desktop notification for {string} says {string}',
  async ({ page }, title: string, body: string): Promise<void> => {
    await expect
      .poll(() => page.evaluate(() => globalThis.notificationProbe.records))
      .toEqual([
        {
          title,
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
    await page.evaluate(() => globalThis.notificationProbe.click());
  },
);

Then(
  'the desktop notification opens its Session in the foreground',
  async ({ app, page }): Promise<void> => {
    const [notice] = await page.evaluate(
      () => globalThis.notificationProbe.records,
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
      await page.evaluate(() => globalThis.notificationProbe.records),
    ).toHaveLength(1);
  },
);

When(
  'I prepare the desktop prompt {string}',
  async ({ page }, prompt: string): Promise<void> => {
    await page.getByRole('textbox', { name: messageLabel }).fill(prompt);
  },
);

When(
  'I send the prepared desktop prompt without activating the window',
  async ({ page }): Promise<void> => {
    await page
      .getByRole('button', { name: 'Send', exact: true })
      .evaluate((button) => button.click());
    await expect(page).toHaveURL(
      /\/sessions\/(?!new)[^/]+$/,
      sessionOpenTimeout,
    );
    await expectMessage(page, '', true);
  },
);

When(
  'I stop the desktop Turn without activating the window',
  async ({ page }): Promise<void> => {
    await page
      .getByRole('button', { name: 'Stop', exact: true })
      .evaluate((button) => button.click());
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0);
  },
);

When('I decline the desktop Elicitation', async ({ page }): Promise<void> => {
  await page
    .getByRole('region', { name: 'Elicitation questions' })
    .getByRole('button', { name: 'Decline', exact: true })
    .click();
});

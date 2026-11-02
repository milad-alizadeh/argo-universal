import {
  installNotificationStub,
  recordedNotificationBodies,
} from '../desktop/notification-api.test.mocks';
import {
  appForeground,
  BackgroundState,
  desktopApplication,
  backgroundWindow,
  windowState,
} from '../desktop/window-state';
import { expect } from '../fixtures';
import { sessionId } from './feed';
import { Given, When, Then } from './fixtures';
import { expectMessage, messageLabel, sessionOpenTimeout } from './new-session';

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
  async ({ page, app }, state: string): Promise<void> => {
    await backgroundWindow(
      desktopApplication(app),
      BackgroundState.parse(state),
    );
    await expect.poll(() => appForeground(page)).toBe(false);
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
  async ({ page, app }): Promise<void> => {
    const application = desktopApplication(app);
    const background = await windowState(application);
    expect(await appForeground(page)).toBe(false);
    // A hidden window paints no frames on Linux, so Playwright's stable check never ends; dispatch the click as the other background steps do.
    await page
      .getByRole('button', { name: 'Settings', exact: true })
      .evaluate<void, void, HTMLElement>((button) => button.click());
    await expect(page).toHaveURL(/\/settings\//);
    await expect.poll(() => windowState(application)).toEqual(background);
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
    await expectMessage(page, prompt);
  },
);

When(
  'I send the prepared desktop prompt without activating the window',
  async ({ page }): Promise<void> => {
    const send = page.getByRole('button', { name: 'Send', exact: true });
    await expect(send).toBeEnabled();
    await send.evaluate<void, void, HTMLElement>((button) => button.click());
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
      .evaluate<void, void, HTMLElement>((button) => button.click());
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toHaveCount(0);
  },
);

When('I decline the desktop Elicitation', async ({ page }): Promise<void> => {
  await page
    .getByRole('region', { name: 'Elicitation questions' })
    .getByRole('button', { name: 'Skip', exact: true })
    .click();
});

Given('Agent 1 asks successive questions', async (): Promise<void> => {});

When(
  'I decline the desktop Elicitation without activating the window',
  async ({ page }): Promise<void> => {
    await page
      .getByRole('region', { name: 'Elicitation questions' })
      .getByRole('button', { name: 'Skip', exact: true })
      .evaluate<void, void, HTMLElement>((button) => button.click());
  },
);

Then(
  'the desktop records {int} notifications saying {string}',
  async ({ page }, count: number, body: string): Promise<void> => {
    await expect
      .poll(() => page.evaluate(recordedNotificationBodies))
      .toEqual(Array.from({ length: count }, () => body));
  },
);

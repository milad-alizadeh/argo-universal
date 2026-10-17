import type { ElectronApplication, Page } from '@playwright/test';
import { z } from 'zod';
import { type App, expect } from '../fixtures';

export const BackgroundState = z.enum(['hidden', 'minimized', 'unfocused']);

export type BackgroundState = z.infer<typeof BackgroundState>;

type WindowState = { focused: boolean; visible: boolean; minimized: boolean };

// Electron on Linux keeps a minimized window visible and focused, so only macOS also reports it hidden and blurred.
const nativeBackground: Record<BackgroundState, Partial<WindowState>> = {
  hidden: { focused: false, visible: false, minimized: false },
  minimized: { minimized: true },
  unfocused: { focused: false, visible: true, minimized: false },
};

export async function backgroundWindow(
  application: ElectronApplication,
  state: BackgroundState,
): Promise<void> {
  await showDesktopWindow(application);
  await expect
    .poll(() => windowState(application))
    .toMatchObject({ focused: true });
  await setBackgroundState(application, state);
  await expect
    .poll(() => windowState(application))
    .toMatchObject(nativeBackground[state]);
}

// The App's own foreground test (use-foreground.web.ts); its notifications follow this, not the native window flags.
export function appForeground(page: Page): Promise<boolean> {
  return page.evaluate<boolean>(
    "document.visibilityState === 'visible' && document.hasFocus() && !window.argo?.window.isMinimized()",
  );
}

async function setBackgroundState(
  application: ElectronApplication,
  state: BackgroundState,
): Promise<void> {
  await application.evaluate(({ BrowserWindow }, next): void => {
    const window = BrowserWindow.getAllWindows()[0];

    if (!window) throw new Error('Expected the App window');

    const actions = {
      hidden: 'hide',
      minimized: 'minimize',
      unfocused: 'blur',
    } as const;

    window[actions[next]]();
  }, state);
}

async function showDesktopWindow(
  application: ElectronApplication,
): Promise<void> {
  await application.evaluate(({ app, BrowserWindow }): void => {
    app.focus({ steal: true });
    BrowserWindow.getAllWindows()[0]?.show();
    BrowserWindow.getAllWindows()[0]?.focus();
  });
}

export function windowState(
  application: ElectronApplication,
): Promise<WindowState> {
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

export function desktopApplication(app: App): ElectronApplication {
  if (!app.desktop)
    throw new Error('Notifications require the Electron project');

  return app.desktop.application;
}

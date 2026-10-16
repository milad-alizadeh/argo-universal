import type { ElectronApplication } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';

export const BackgroundState = z.enum(['hidden', 'minimized', 'unfocused']);

export type BackgroundState = z.infer<typeof BackgroundState>;

export async function backgroundWindow(
  application: ElectronApplication,
  state: BackgroundState,
): Promise<void> {
  await showDesktopWindow(application);
  await expect
    .poll(() => windowState(application))
    .toMatchObject({ focused: true });
  await setBackgroundState(application, state);
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
  await application.evaluate(({ BrowserWindow }): void => {
    BrowserWindow.getAllWindows()[0]?.show();
  });
}

export function windowState(
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

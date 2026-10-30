import { ipcMain } from 'electron';
import { isTrustedWindow } from './trusted-window';

// Try again in the App's Connection banner: a Server this app started can be gone rather than out of reach, so the window asks for a Supervisor again.
export function handleServerRetry(origin: string, retry: () => void): void {
  ipcMain.on('server:retry', (event): void => {
    if (!isTrustedWindow(event, origin)) return;
    retry();
  });
}

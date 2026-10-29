import { BrowserWindow, ipcMain } from 'electron';
import { isTrustedWindow } from './trusted-window';

// Linux keeps a minimized window visible and focused to its page, so the App reads minimized from here.
export function handleWindowMinimized(windowOrigin: string): void {
  ipcMain.handle('window:minimized', (event): boolean => {
    if (!isTrustedWindow(event, windowOrigin)) return false;

    return isMinimized(event.sender);
  });
}

export function reportWindowMinimized(window: BrowserWindow): void {
  const report = (): void => {
    window.webContents.send('window:minimized', window.isMinimized());
  };

  window.on('minimize', report);
  window.on('restore', report);
}

function isMinimized(sender: Electron.WebContents): boolean {
  return BrowserWindow.fromWebContents(sender)?.isMinimized() ?? false;
}

import { app, BrowserWindow, ipcMain } from 'electron';
import { isTrustedWindow } from './trusted-window';

function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore();
  app.focus({ steal: true });
  window.show();
  window.focus();
}

export function handleWindowShow(windowOrigin: string): void {
  ipcMain.on('window:show', (event): void => {
    if (!isTrustedWindow(event, windowOrigin)) return;

    const window = BrowserWindow.fromWebContents(event.sender);

    if (window) showWindow(window);
  });
}

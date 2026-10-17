import { BrowserWindow, ipcMain } from 'electron';

// Linux keeps a minimized window visible and focused to its page, so the App reads minimized from here.
export function handleWindowMinimized(windowOrigin: string): void {
  ipcMain.handle('window:minimized', (event): boolean => {
    if (event.senderFrame?.origin !== windowOrigin) return false;

    return BrowserWindow.fromWebContents(event.sender)?.isMinimized() ?? false;
  });
}

export function reportWindowMinimized(window: BrowserWindow): void {
  const report = (): void => {
    window.webContents.send('window:minimized', window.isMinimized());
  };

  window.on('minimize', report);
  window.on('restore', report);
}

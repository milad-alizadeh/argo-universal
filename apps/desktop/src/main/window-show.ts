import { BrowserWindow, ipcMain } from 'electron';

function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function handleWindowShow(windowOrigin: string): void {
  ipcMain.on('window:show', (event): void => {
    if (event.senderFrame?.origin !== windowOrigin) return;

    const window = BrowserWindow.fromWebContents(event.sender);

    if (window) showWindow(window);
  });
}

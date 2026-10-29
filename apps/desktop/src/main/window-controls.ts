import { BrowserWindow, ipcMain } from 'electron';
import { isTrustedWindow } from './trusted-window';

type Action = 'minimize' | 'maximize' | 'close';

function toggleMaximize(window: BrowserWindow): void {
  if (window.isMaximized()) window.unmaximize();
  else window.maximize();
}

function performAction(window: BrowserWindow, action: Action): void {
  if (action === 'maximize') toggleMaximize(window);
  else window[action]();
}

export function handleWindowControls(origin: string): void {
  for (const action of ['minimize', 'maximize', 'close'] as const)
    ipcMain.on(`window:${action}`, (event): void => {
      if (!isTrustedWindow(event, origin)) return;
      const window = BrowserWindow.fromWebContents(event.sender);

      if (window) performAction(window, action);
    });
}

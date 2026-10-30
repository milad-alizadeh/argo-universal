import { BrowserWindow, ipcMain } from 'electron';
import { z } from 'zod';
import { reportUnrecognised } from './report-unrecognised';
import { isTrustedWindow } from './trusted-window';

// The sRGB hex the page reads its content surface as; Electron takes nothing wider.
const WindowBackground = z.string().regex(/^#[\da-f]{6}$/iu);

// The window shows its own colour wherever the page has not painted yet, as while it resizes.
export function handleWindowBackground(windowOrigin: string): void {
  ipcMain.on('window:background', (event, input): void => {
    if (!isTrustedWindow(event, windowOrigin)) return;
    const color = WindowBackground.safeParse(input);

    if (!color.success) {
      reportUnrecognised('window background', color.error);

      return;
    }

    setBackgroundColor(event.sender, color.data);
  });
}

function setBackgroundColor(sender: Electron.WebContents, color: string): void {
  BrowserWindow.fromWebContents(sender)?.setBackgroundColor(color);
}

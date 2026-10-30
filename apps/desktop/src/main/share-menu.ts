import { DesktopShare } from '@repo/contracts/desktop-share';
import {
  BrowserWindow,
  ipcMain,
  ShareMenu,
  type IpcMainInvokeEvent,
} from 'electron';
import { readShareRequest } from './share-request';
import { isTrustedWindow } from './trusted-window';

export function handleShareMenu(windowOrigin: string): void {
  if (process.platform !== 'darwin') return;
  ipcMain.handle('share:open', (event, input): Promise<void> => {
    const window = shareWindow(event, windowOrigin);
    const content = readShareRequest(DesktopShare.safeParse(input));

    return openShareMenu(window, content);
  });
}

function shareWindow(
  event: IpcMainInvokeEvent,
  windowOrigin: string,
): BrowserWindow {
  if (!isTrustedWindow(event, windowOrigin))
    throw new Error('Untrusted share request');
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window) throw new Error('Share window is unavailable');

  return window;
}

function openShareMenu(
  window: BrowserWindow,
  content: DesktopShare,
): Promise<void> {
  const menu = new ShareMenu({
    texts: content.title ? [content.title, content.message] : [content.message],
    urls: content.url ? [content.url] : undefined,
  });

  return new Promise((resolve) => menu.popup({ window, callback: resolve }));
}

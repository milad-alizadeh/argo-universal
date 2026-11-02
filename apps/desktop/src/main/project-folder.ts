import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
} from 'electron';
import { isTrustedWindow } from './trusted-window';

// A user-picked directory is the only path the renderer gets; git and registration stay on the Server.
export function handleProjectFolder(origin: string): void {
  if (process.platform !== 'darwin') return;

  ipcMain.handle('project:choose-folder', (event): Promise<string | null> =>
    chooseFolder(folderWindow(event, origin)),
  );
}

function folderWindow(
  event: IpcMainInvokeEvent,
  origin: string,
): BrowserWindow {
  if (!isTrustedWindow(event, origin))
    throw new Error('Untrusted folder selection request');

  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window) throw new Error('Folder selection window is unavailable');

  return window;
}

async function chooseFolder(window: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    title: 'Choose Project Folder',
    buttonLabel: 'Choose Folder',
    properties: ['openDirectory'],
  });

  return result.canceled ? null : (result.filePaths[0] ?? null);
}

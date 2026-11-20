import type { ScreenCaptureAnswer } from '@repo/contracts/operations';
import {
  desktopCapturer,
  ipcMain,
  screen,
  systemPreferences,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from 'electron';
import {
  captureMainScreen,
  type ScreenPort,
  type ScreenSource,
} from './screen-capture';
import { isTrustedWindow } from './trusted-window';

const refusedByMac = (): boolean =>
  ['denied', 'restricted'].includes(
    systemPreferences.getMediaAccessStatus('screen'),
  );

// Only macOS says no to reading the screen.
const access = (): 'granted' | 'denied' =>
  process.platform === 'darwin' && refusedByMac() ? 'denied' : 'granted';

// The pictures of every display, drawn at the main display's own pixel size.
async function thumbnails(): Promise<ScreenSource[]> {
  const { size, scaleFactor } = screen.getPrimaryDisplay();

  const found = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: size.width * scaleFactor,
      height: size.height * scaleFactor,
    },
  });

  return found.map(({ display_id: displayId, thumbnail }) => ({
    displayId,
    png: thumbnail.isEmpty() ? '' : thumbnail.toPNG().toString('base64'),
  }));
}

// Whether the person turned screen sight on for this Device, as the App last reported it; off until it does.
let enabled = false;

const electronScreen: ScreenPort = {
  platform: process.platform,
  enabled: () => enabled,
  access,
  mainDisplayId: () => String(screen.getPrimaryDisplay().id),
  sources: thumbnails,
};

// The App's own page asks for a picture of the screen; nothing else may.
export function handleScreenCapture(origin: string): void {
  ipcMain.on('screen:enabled', (event: IpcMainEvent, next: boolean): void => {
    if (isTrustedWindow(event, origin)) enabled = next === true;
  });

  ipcMain.handle(
    'screen:capture',
    (event: IpcMainInvokeEvent): Promise<ScreenCaptureAnswer> => {
      if (!isTrustedWindow(event, origin))
        throw new Error('Untrusted screen capture request');

      return captureMainScreen(electronScreen);
    },
  );
}

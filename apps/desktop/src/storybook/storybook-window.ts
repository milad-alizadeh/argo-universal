import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { handleSymbolImages } from '../main/symbol-images';

/*
 * Development only: shows a running Storybook in a window whose preload is the desktop app's, so stories draw SF
 * Symbols as the macOS app does. `scripts/storybook-mac.mts` builds and starts this; Forge never builds it, so it
 * never ships. Apple's licence keeps SF Symbols to Apple platforms: macOS draws each one at runtime and no image is
 * written to the Storybook or web build.
 */
const storybookUrl = process.env.ARGO_STORYBOOK_URL;

if (!storybookUrl) throw new Error('ARGO_STORYBOOK_URL is not set');

const { origin } = new URL(storybookUrl);

const createWindow = (url: string): void => {
  const storybookWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'Storybook (SF Symbols)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // The preload runs in the top frame; the preview iframe reads its bridge through window.parent.
      sandbox: true,
    },
  });

  void storybookWindow.loadURL(url);
};

handleSymbolImages(origin);

void app.whenReady().then((): void => createWindow(storybookUrl));

app.on('window-all-closed', (): void => app.quit());

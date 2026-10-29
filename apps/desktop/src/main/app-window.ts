import path from 'node:path';
import {
  app,
  BrowserWindow,
  screen,
  shell,
  type WindowOpenHandlerResponse,
  type WebPreferences,
} from 'electron';
import { appOrigin } from './app-protocol';
import { reportWindowMinimized } from './window-minimized';
import {
  readWindowState,
  saveWindowState,
  windowBounds,
  type WindowState,
} from './window-state';

type WindowOptions = {
  origin: string;
  developmentUrl: string | undefined;
  background: boolean;
};

export const originOf = (url: string): string => {
  const { protocol, host } = new URL(url);

  return `${protocol}//${host}`;
};

function restoreBounds(saved: WindowState | undefined): Electron.Rectangle {
  const display = saved
    ? screen.getDisplayMatching(saved.bounds)
    : screen.getPrimaryDisplay();

  return windowBounds(saved?.bounds, display.workArea);
}

function makeWindow(
  url: string,
  options: WindowOptions,
  saved: WindowState | undefined,
): BrowserWindow {
  return new BrowserWindow({
    ...restoreBounds(saved),
    minWidth: 600,
    show: !options.background,
    ...windowChrome(),
    webPreferences: webPreferences(url, options.background),
  });
}

function windowChrome():
  | { titleBarStyle: 'hidden'; trafficLightPosition: { x: number; y: number } }
  | undefined {
  return process.platform === 'darwin'
    ? { titleBarStyle: 'hidden', trafficLightPosition: { x: 20, y: 16 } }
    : undefined;
}

function webPreferences(url: string, background: boolean): WebPreferences {
  return {
    backgroundThrottling: !background,
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    additionalArguments: [`--server-url=${url}`],
  };
}

function openBrowserLink(target: string): void {
  if (!URL.canParse(target)) return;
  const { protocol } = new URL(target);

  if (!isBrowserProtocol(protocol)) return;
  void shell.openExternal(target).catch((error: Error) => {
    console.error('Could not open browser link', error);
  });
}

function isBrowserProtocol(protocol: string): boolean {
  return protocol === 'https:' || protocol === 'http:';
}

function bindNavigation(window: BrowserWindow, origin: string): void {
  window.webContents.on('will-navigate', (event, target): void => {
    if (originOf(target) === origin) return;
    event.preventDefault();
    openBrowserLink(target);
  });
  window.webContents.setWindowOpenHandler(
    ({ url }): WindowOpenHandlerResponse => {
      openBrowserLink(url);

      return { action: 'deny' };
    },
  );
}

function saveOnClose(window: BrowserWindow, stateFile: string): void {
  window.on('close', () => {
    saveWindowState(stateFile, {
      bounds: window.getNormalBounds(),
      maximized: window.isMaximized(),
    });
  });
}

export function createWindow(url: string, options: WindowOptions): void {
  const stateFile = path.join(app.getPath('userData'), 'window-state.json');
  const saved = readWindowState(stateFile);
  const window = makeWindow(url, options, saved);

  restoreMaximized(window, saved);
  saveOnClose(window, stateFile);
  reportWindowMinimized(window);
  bindNavigation(window, options.origin);
  void window.loadURL(options.developmentUrl ?? `${appOrigin}/`);
}

function restoreMaximized(
  window: BrowserWindow,
  saved: WindowState | undefined,
): void {
  if (saved?.maximized) window.maximize();
}

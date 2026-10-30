import path from 'node:path';
import type { ServerAddress } from '@repo/contracts';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  shell,
  type WindowOpenHandlerResponse,
} from 'electron';
import { createActor } from 'xstate';
import {
  appOrigin,
  handleAppProtocol,
  registerAppScheme,
} from './app-protocol';
import { applicationMenu } from './application-menu';
import { serverConnectionMachine } from './server-machine';
import { resolveHome } from './server-process';
import { handleShareMenu } from './share-menu';
import { handleSymbolImages } from './symbol-images';
import { handleWindowBackground } from './window-background';
import {
  handleWindowMinimized,
  reportWindowMinimized,
} from './window-minimized';
import { handleWindowShow } from './window-show';
import { readWindowState, saveWindowState, windowBounds } from './window-state';

// The dev script sets the Expo web dev URL; without it the window loads the web export over app://.
const webDevelopmentUrl = process.env.ARGO_EXPO_WEB_URL;

const appDirectory = app.getAppPath();

const cliDirectory = path.join(appDirectory, '../cli');

const webExportDirectory = path.join(appDirectory, '../universal-app/dist');

// Node's URL gives origin 'null' for the app: scheme, so build the origin from its parts.
const originOf = (url: string): string => {
  const { protocol, host } = new URL(url);

  return `${protocol}//${host}`;
};

const windowOrigin = webDevelopmentUrl
  ? originOf(webDevelopmentUrl)
  : appOrigin;

// Tests give each launch its own app data, so launches neither share the single-instance lock nor touch the owner's.
const userDataDirectory = process.env.ARGO_USER_DATA_DIRECTORY;

if (userDataDirectory) app.setPath('userData', userDataDirectory);

// Tests open the window hidden and keep the app out of the Dock, so a run never takes focus.
const runsInBackground = process.env.ARGO_BACKGROUND === '1';

if (runsInBackground && process.platform === 'darwin') {
  app.setActivationPolicy('accessory');
}

registerAppScheme();

const serverUrl = (address: ServerAddress): string =>
  `ws://127.0.0.1:${address.port}`;

// Makes sure a Supervisor runs; on quit it stops only one that it started.
const home = resolveHome();

const server = createActor(serverConnectionMachine, {
  input: {
    home,
    cliDirectory,
    askToKeepSessions: async (running): Promise<boolean> => {
      const { response } = await dialog.showMessageBox({
        type: 'question',
        message: `${running} Sessions are running. Keep them going?`,
        buttons: ['Keep', 'Stop'],
        defaultId: 0,
        cancelId: 0,
      });

      return response === 0;
    },
  },
});

// The 12px lights are centred in the window band's 44px row.
const trafficLights = { x: 20, y: 16 };

const createWindow = (url: string): void => {
  const stateFile = path.join(app.getPath('userData'), 'window-state.json');
  const saved = readWindowState(stateFile);

  const display = saved
    ? screen.getDisplayMatching(saved.bounds)
    : screen.getPrimaryDisplay();

  const mainWindow = new BrowserWindow({
    ...windowBounds(saved?.bounds, display.workArea),
    // Below 600 is a phone's width, the compact size class (ADR-0026).
    minWidth: 600,
    show: !runsInBackground,
    // On macOS the traffic lights sit in the shared top bar's window controls on the glass, with no title bar above.
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hidden',
      trafficLightPosition: trafficLights,
    }),
    webPreferences: {
      // A hidden window would otherwise throttle timers and animations.
      backgroundThrottling: !runsInBackground,
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The preload reads the Server URL from its process.argv.
      additionalArguments: [`--server-url=${url}`],
    },
  });

  if (saved?.maximized) mainWindow.maximize();
  mainWindow.on('close', () => {
    saveWindowState(stateFile, {
      bounds: mainWindow.getNormalBounds(),
      maximized: mainWindow.isMaximized(),
    });
  });
  reportWindowMinimized(mainWindow);

  // Keep the window on the App; the development inspector opens separately.
  mainWindow.webContents.on('will-navigate', (event, target): void => {
    if (originOf(target) === windowOrigin) return;
    event.preventDefault();
    openBrowserLink(target);
  });
  mainWindow.webContents.setWindowOpenHandler(
    ({ url }): WindowOpenHandlerResponse => {
      openBrowserLink(url);

      return { action: 'deny' };
    },
  );

  void mainWindow.loadURL(webDevelopmentUrl ?? `${appOrigin}/`);
};

// Agent metadata and Feed links open in the system browser, never a second App window.
function openBrowserLink(target: string): void {
  if (!URL.canParse(target)) return;
  const { protocol } = new URL(target);

  if (protocol !== 'https:' && protocol !== 'http:') return;
  void shell.openExternal(target).catch((error: Error) => {
    console.error('Could not open browser link', error);
  });
}

for (const action of ['minimize', 'maximize', 'close'] as const) {
  ipcMain.on(`window:${action}`, (event): void => {
    if (event.senderFrame?.origin !== windowOrigin) return;
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) return;

    if (action !== 'maximize') window[action]();
    else if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
}

handleWindowShow(windowOrigin);

handleWindowMinimized(windowOrigin);

handleWindowBackground(windowOrigin);

handleShareMenu(windowOrigin);

if (process.platform === 'darwin') handleSymbolImages(windowOrigin);

let serverStarted = false;

const start = (): void => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(applicationMenu(process.platform)),
  );

  if (!webDevelopmentUrl) handleAppProtocol(webExportDirectory);
  let url: string | null = null;
  server.on('server.ready', ({ address }): void => {
    url = serverUrl(address);

    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
  server.on('badge.changed', ({ attention }): void => {
    app.dock?.setBadge(attention > 0 ? String(attention) : '');
  });

  // The failure dialog offers Retry and Quit.
  server.on('server.failed', ({ failure }): void => {
    void dialog
      .showMessageBox({
        type: 'error',
        message: 'Argo could not start the Server',
        detail: failure ?? undefined,
        buttons: ['Retry', 'Quit'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }): void => {
        if (response === 0) server.send({ type: 'server.retry' });
        else app.quit();
      });
  });
  server.subscribe({
    error: (error): void => {
      void dialog
        .showMessageBox({
          type: 'error',
          message: 'Argo could not start the Server',
          detail: String(error),
          buttons: ['Quit'],
        })
        .then((): void => app.quit());
    },
  });
  ipcMain.on('server:retry', (event): void => {
    if (event.senderFrame?.origin !== windowOrigin) return;
    server.send({ type: 'server.retry' });
  });
  server.start();
  serverStarted = true;

  // On macOS, clicking the dock icon with no window open opens one.
  app.on('activate', (): void => {
    if (url && BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
};

// A second launch hands over to the first one, which shows its window, and quits.
if (app.requestSingleInstanceLock()) {
  app.on('second-instance', (): void => {
    const window = BrowserWindow.getAllWindows()[0];

    if (!window) return;

    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });

  void app.whenReady().then(start);
} else {
  app.quit();
}

// Quit waits for the Server machine, which stops the Supervisor only if this app started it.
server.subscribe({
  complete: (): void => {
    queueMicrotask((): void => app.quit());
  },
});

app.on('before-quit', (event): void => {
  if (!serverStarted || server.getSnapshot().status !== 'active') return;
  event.preventDefault();
  server.send({ type: 'app.quit' });
});

// Closing the last window quits, except on macOS, where the app stays until Cmd+Q.
app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

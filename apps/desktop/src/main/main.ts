import path from 'node:path';
import type { ServerAddress } from '@repo/contracts';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { createActor } from 'xstate';
import {
  appOrigin,
  handleAppProtocol,
  registerAppScheme,
} from './app-protocol';
import { serverConnectionMachine } from './server-machine';
import { resolveHome } from './server-process';

// The dev script sets the Expo web dev URL; without it the window loads the web export over app://.
const webDevelopmentUrl = process.env.ARGO_EXPO_WEB_URL;
const appDirectory = app.getAppPath();
const serverDirectory = path.join(appDirectory, '../server');
const webExportDirectory = path.join(appDirectory, '../universal-app/dist');
// Node's URL gives origin 'null' for the app: scheme, so build the origin from its parts.
const originOf = (url: string) => {
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

const serverUrl = (address: ServerAddress) => `ws://127.0.0.1:${address.port}`;

// Makes sure a Supervisor runs; on quit it stops only one that it started.
const home = resolveHome();
const server = createActor(serverConnectionMachine, {
  input: { home, serverDirectory },
});

const createWindow = (url: string) => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: !runsInBackground,
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

  // Keep the window on the App; the development inspector opens separately.
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (originOf(target) !== windowOrigin) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  void mainWindow.loadURL(webDevelopmentUrl ?? `${appOrigin}/`);
};

for (const action of ['minimize', 'maximize', 'close'] as const) {
  ipcMain.on(`window:${action}`, (event) => {
    if (event.senderFrame?.origin !== windowOrigin) return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (action !== 'maximize') window[action]();
    else if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
}

let serverStarted = false;

const start = () => {
  if (!webDevelopmentUrl) handleAppProtocol(webExportDirectory);
  let url: string | null = null;
  server.on('server.ready', ({ address }) => {
    url = serverUrl(address);
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });

  // The failure dialog offers Retry and Quit.
  let failed = false;
  server.subscribe((snapshot) => {
    const enteredFailed = snapshot.matches('failed') && !failed;
    failed = snapshot.matches('failed');
    if (!enteredFailed) return;
    void dialog
      .showMessageBox({
        type: 'error',
        message: 'Argo could not start the Server',
        detail: snapshot.context.failure ?? undefined,
        buttons: ['Retry', 'Quit'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) server.send({ type: 'server.retry' });
        else app.quit();
      });
  });
  server.start();
  serverStarted = true;

  // On macOS, clicking the dock icon with no window open opens one.
  app.on('activate', () => {
    if (url && BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
};

// A second launch hands over to the first one, which shows its window, and quits.
if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
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
  complete: () => {
    app.quit();
  },
});
app.on('will-quit', (event) => {
  if (!serverStarted || server.getSnapshot().status !== 'active') return;
  server.send({ type: 'app.quit' });
  // A reused Supervisor stops synchronously; prevent quit only while an owned one is stopping.
  if (server.getSnapshot().status === 'active') event.preventDefault();
});

// Closing the last window quits, except on macOS, where the app stays until Cmd+Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import {
  appOrigin,
  handleAppProtocol,
  registerAppScheme,
} from './app-protocol';
import {
  createServerLifecycle,
  type ServerLifecycle,
  serverUrl,
} from './server-lifecycle';
import {
  createServerProcessDependencies,
  readServerVersion,
  resolveHome,
} from './server-process';

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

registerAppScheme();

let lifecycle: ServerLifecycle | undefined;

const createWindow = (url: string) => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The preload reads the Server URL from its process.argv.
      additionalArguments: [`--server-url=${url}`],
    },
  });

  // Keep the window on the App; open nothing else.
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

const start = async () => {
  if (!webDevelopmentUrl) handleAppProtocol(webExportDirectory);
  lifecycle = createServerLifecycle(
    createServerProcessDependencies({
      home: resolveHome(),
      serverDirectory,
      version: await readServerVersion(serverDirectory),
    }),
  );
  const url = serverUrl(await lifecycle.connect());
  createWindow(url);

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
};

// A second launch hands over to the first one, which shows its window, and quits.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      // Quitting stops a starting Server, which then fails its start; that is no error to show.
      if (!released) dialog.showErrorBox('Argo could not start', String(error));
      app.quit();
    });
}

// Stop the Server on quit only if this app started it (spec section 9).
let released = false;
app.on('will-quit', (event) => {
  if (released || !lifecycle) return;
  event.preventDefault();
  released = true;
  lifecycle
    .release()
    .catch((error: unknown) => console.error('desktop:', error))
    .finally(() => app.quit());
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

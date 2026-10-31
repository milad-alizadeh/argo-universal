import path from 'node:path';
import type { ServerAddress } from '@repo/contracts';
import { app, BrowserWindow, dialog, Menu, session } from 'electron';
import { createActor } from 'xstate';
import {
  appOrigin,
  handleAppProtocol,
  registerAppScheme,
} from './app-protocol';
import { createWindow, originOf } from './app-window';
import { applicationMenu } from './application-menu';
import {
  reportFailure,
  reportUnexpectedFailure,
} from './server-failure-dialog';
import { serverConnectionMachine } from './server-machine';
import { resolveHome } from './server-process';
import { handleServerRetry } from './server-retry';
import { attachServerToken } from './server-token';
import { handleShareMenu } from './share-menu';
import { handleSymbolImages } from './symbol-images';
import { handleWindowBackground } from './window-background';
import { handleWindowControls } from './window-controls';
import { handleWindowMinimized } from './window-minimized';
import { handleWindowShow } from './window-show';

// The dev script sets the Expo web dev URL; without it the window loads the web export over app://.
const webDevelopmentUrl = process.env.ARGO_EXPO_WEB_URL;

const appDirectory = app.getAppPath();

const cliDirectory = path.join(appDirectory, '../cli');

const webExportDirectory = path.join(appDirectory, '../universal-app/dist');

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

// Makes sure a Supervisor runs, adopting one that already runs; on quit it stops only one that it started, and none when the Server is set to keep running.
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

const showAppWindow = (url: string): void =>
  createWindow(url, {
    origin: windowOrigin,
    developmentUrl: webDevelopmentUrl,
    background: runsInBackground,
  });

handleWindowControls(windowOrigin);

handleWindowShow(windowOrigin);

handleWindowMinimized(windowOrigin);

handleWindowBackground(windowOrigin);

handleShareMenu(windowOrigin);

if (process.platform === 'darwin') handleSymbolImages(windowOrigin);

const retryServer = (): void => server.send({ type: 'server.retry' });

handleServerRetry(windowOrigin, retryServer);

let serverStarted = false;

let currentUrl: string | null = null;

// The Server is listening: its page's media loads carry no Origin, so this process proves them with the user token (#1696).
function serverReady(address: ServerAddress): void {
  currentUrl = serverUrl(address);
  void attachServerToken({
    session: session.defaultSession,
    home,
    port: address.port,
  });

  if (BrowserWindow.getAllWindows().length === 0) showAppWindow(currentUrl);
}

function listenToServer(): void {
  server.on('server.ready', ({ address }): void => serverReady(address));
  server.on('badge.changed', ({ attention }): void => {
    app.dock?.setBadge(attention > 0 ? String(attention) : '');
  });
  server.on('server.failed', ({ failure }): void =>
    reportFailure(failure, retryServer),
  );
  server.subscribe({
    error: (error): void => reportUnexpectedFailure(String(error)),
  });
}

const start = (): void => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(applicationMenu(process.platform)),
  );

  if (!webDevelopmentUrl) handleAppProtocol(webExportDirectory);

  listenToServer();
  server.start();
  serverStarted = true;

  // On macOS, clicking the dock icon with no window open opens one.
  app.on('activate', (): void => {
    if (currentUrl && BrowserWindow.getAllWindows().length === 0)
      showAppWindow(currentUrl);
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

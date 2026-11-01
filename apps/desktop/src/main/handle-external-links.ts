import { app, BrowserWindow, ipcMain } from 'electron';
import { externalScheme, LinkInbox, screenLinkIn } from './external-links';
import { isTrustedWindow } from './trusted-window';

export interface ExternalLinks {
  receive: (link: string) => void;
  receiveLaunch: (argv: string[]) => void;
}

function sendToWindow(link: string): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send('links:open', link);
}

// The page asks for links once it listens, and a reload stops it until it asks again.
function listenWhenPageAsks(inbox: LinkInbox, windowOrigin: string): void {
  ipcMain.on('links:ready', (event): void => {
    if (isTrustedWindow(event, windowOrigin)) inbox.listen();
  });
  app.on('browser-window-created', (_event, window): void => {
    window.webContents.on('did-start-loading', (): void =>
      inbox.stopListening(),
    );
  });
}

// macOS hands a link over as an event, and does so before `ready` on a cold start.
function handleOpenUrl(receive: ExternalLinks['receive']): void {
  app.on('open-url', (event, url): void => {
    event.preventDefault();
    receive(url);
  });
}

const launchLinks =
  (receive: ExternalLinks['receive']): ExternalLinks['receiveLaunch'] =>
  (argv): void => {
    const link = screenLinkIn(argv);

    if (link) receive(link);
  };

/*
 * Opens the system's `argo://` Screen links in the one running app: macOS delivers them as `open-url`, Windows and
 * Linux as an argument of the launch. A link only navigates; the page resolves it. `showWindow` makes a window
 * when none is open, since a link can arrive after the last one closed.
 */
export function handleExternalLinks(
  windowOrigin: string,
  showWindow: () => void,
): ExternalLinks {
  const inbox = new LinkInbox(sendToWindow);

  const receive = (link: string): void => {
    if (inbox.receive(link)) showWindow();
  };

  // Packaged builds own the scheme; a development run would register the bare Electron binary.
  if (app.isPackaged) app.setAsDefaultProtocolClient(externalScheme);

  listenWhenPageAsks(inbox, windowOrigin);

  handleOpenUrl(receive);

  return { receive, receiveLaunch: launchLinks(receive) };
}

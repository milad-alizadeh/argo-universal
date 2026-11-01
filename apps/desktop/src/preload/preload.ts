import type { DesktopBridge } from '@repo/contracts';
/*
 * See the Electron documentation for details on how to use preload scripts:
 * https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 */
import { contextBridge, ipcRenderer } from 'electron';

// Main passes the Server URL in additionalArguments; a sandboxed preload can read only process.argv.
const serverUrlPrefix = '--server-url=';

const serverUrl =
  process.argv
    .find((argument): boolean => argument.startsWith(serverUrlPrefix))
    ?.slice(serverUrlPrefix.length) ?? null;

// Only macOS has SF Symbols to draw; elsewhere the page falls back to Material Symbols.
const symbols: DesktopBridge['symbols'] =
  process.platform === 'darwin'
    ? {
        render: (request) => ipcRenderer.invoke('symbol:render', request),
      }
    : undefined;

// Main reports each minimize and restore; a reload asks for the current state once.
let minimized = false;

const minimizedListeners = new Set<(minimized: boolean) => void>();

const setMinimized = (next: boolean): void => {
  if (next === minimized) return;

  minimized = next;

  for (const listener of minimizedListeners) listener(next);
};

ipcRenderer.on('window:minimized', (_event, next: boolean): void =>
  setMinimized(next),
);

ipcRenderer
  .invoke('window:minimized')
  .then((next: boolean): void => setMinimized(next))
  // The Storybook window has no handler; it is never minimized to the App.
  .catch((): void => undefined);

// Main sends each Screen link the system opens; the first listener tells main the page can take the ones held.
const linkListeners = new Set<(link: string) => void>();

ipcRenderer.on('links:open', (_event, link: string): void => {
  for (const listener of linkListeners) listener(link);
});

// ADR-0002 permits native sharing of text and URLs alongside window controls and system symbols.
const argo = {
  serverUrl,
  share:
    process.platform === 'darwin'
      ? (content): Promise<void> => ipcRenderer.invoke('share:open', content)
      : undefined,
  retryServer: (): void => ipcRenderer.send('server:retry'),
  window: {
    show: (): void => ipcRenderer.send('window:show'),
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    setBackgroundColor: (color): void =>
      ipcRenderer.send('window:background', color),
    isMinimized: (): boolean => minimized,
    onMinimizedChange: (listener): (() => void) => {
      minimizedListeners.add(listener);

      return (): void => {
        minimizedListeners.delete(listener);
      };
    },
  },
  links: {
    onOpen: (listener): (() => void) => {
      linkListeners.add(listener);
      ipcRenderer.send('links:ready');

      return (): void => {
        linkListeners.delete(listener);
      };
    },
  },
  symbols,
} satisfies DesktopBridge;

contextBridge.exposeInMainWorld('argo', argo);

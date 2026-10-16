import type { DesktopBridge } from '@repo/contracts';
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
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

// The renderer gets the Server address, window controls and system symbols, nothing else (ADR 0002).
const argo = {
  serverUrl,
  window: {
    show: (): void => ipcRenderer.send('window:show'),
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
  },
  symbols,
} satisfies DesktopBridge;

contextBridge.exposeInMainWorld('argo', argo);

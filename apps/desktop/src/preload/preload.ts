// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Main passes the Server URL in additionalArguments; a sandboxed preload can read only process.argv.
const serverUrlPrefix = '--server-url=';
const serverUrl =
  process.argv
    .find((argument): boolean => argument.startsWith(serverUrlPrefix))
    ?.slice(serverUrlPrefix.length) ?? null;

// The renderer gets the Server address and window controls, nothing else (ADR 0002).
contextBridge.exposeInMainWorld('argo', {
  serverUrl,
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
  },
});
